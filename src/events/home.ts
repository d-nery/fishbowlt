import { Blocks, HomeTab, Elements, omitIfFalsy, Bits, ViewBlockBuilder, user, Md, Message, Attachment, omitIfTruthy } from "slack-block-builder";
import { WebClient } from "@slack/web-api";
import _ from "underscore";

import { IEvent } from ".";
import data from "../services/data";

const get_home_blocks = (user: string) => {
    const is_admin = data.admins.includes(user);
    const subjects = is_admin ? _.sortBy(data.get_subjects(), (a) => -a.votes) : data.get_subjects();
    const show_votes = is_admin || data.show_votes();

    return HomeTab()
        .blocks(
            Blocks.Header().text("Fishbowl! :fish:"),
            subjects.flatMap((s) => {
                const showDelete = is_admin || s.author == user;
                const voted = data.get_votes(user).includes(s.id);
                const blocks: ViewBlockBuilder[] = [
                    Blocks.Section().text((show_votes ? Md.bold(`[${s.votes}]`) + " " : "") + `${s.subject}`),
                    Blocks.Actions().elements(
                        Elements.Button().text("Vote").primary(voted).actionId("switch-vote").value(`${s.id}`),
                        omitIfFalsy(
                            showDelete,
                            Elements.Button()
                                .text("🗑️")
                                .actionId("delete-subject")
                                .value(`${s.id}`)
                                .confirm(
                                    Bits.ConfirmationDialog()
                                        .title("Apagar tópico")
                                        .text("Deseja apagar esse tópico?")
                                        .confirm("Ok")
                                        .danger()
                                        .deny("Cancelar")
                                )
                        ),
                        omitIfFalsy(
                            is_admin,
                            Elements.Button()
                                .text("Escolher")
                                .actionId("choose-subject")
                                .value(`${s.id}`)
                                .primary()
                                .confirm(
                                    Bits.ConfirmationDialog()
                                        .title("Escolher tópico")
                                        .text(
                                            "Deseja escolher esse tópico? Ele será movido para a lista de tópicos já escolhidos e uma mensagem será mandada no canal com ele e o link da chamada!"
                                        )
                                        .confirm("Ok")
                                        .danger()
                                        .deny("Cancelar")
                                )
                        )
                    ),
                    Blocks.Divider(),
                ];

                return blocks;
            }),

            Blocks.Input()
                .dispatchAction(true)
                .label("Envie um novo tema!")
                .element(Elements.TextInput().dispatchActionOnEnterPressed().actionId("new-subject-action").placeholder("Tema...")),
            omitIfTruthy(data.past_subjects().length == 0, [
                Blocks.Header().text("Tópicos passados"),
                Blocks.Section().text(Md.listBullet(data.past_subjects())),
            ]),
            omitIfFalsy(is_admin, [
                Blocks.Header().text("Gerenciar :hammer:"),
                Blocks.Actions().elements(
                    Elements.Button()
                        .text("Enviar Tópicos")
                        .value("send-topics")
                        .actionId("send-topics")
                        .primary()
                        .confirm(
                            Bits.ConfirmationDialog()
                                .title("Enviar tópicos")
                                .text("Deseja enviar os tópicos do fishbowl?")
                                .confirm("Ok")
                                .primary()
                                .deny("Cancelar")
                        ),
                    Elements.Button()
                        .text(`${data.show_votes() ? "Esconder" : "Mostrar"} votos`)
                        .value("toggle-show-votes")
                        .actionId("toggle-show-votes"),
                    Elements.Button()
                        .text("Resetar Votos")
                        .value("reset-votes")
                        .actionId("reset-votes")
                        .danger()
                        .confirm(
                            Bits.ConfirmationDialog()
                                .title("Resetar votos")
                                .text("Deseja resetar todos os votos?")
                                .confirm("Ok")
                                .danger()
                                .deny("Cancelar")
                        )
                ),
            ])
        )
        .buildToObject();
};

const reload_home = async (client: WebClient, user: string) => {
    await client.views.publish({
        user_id: user,
        view: get_home_blocks(user),
    });
};

export const HomeTabEvent: IEvent = {
    name: "app_home_opened",
    run: async ({ event, client }) => {
        if (event.type !== "app_home_opened") {
            return;
        }

        await reload_home(client, event.user);
    },
    actions: [
        {
            name: "new-subject-action",
            run: async ({ ack, action, body, client }) => {
                await ack();

                if (action.type !== "plain_text_input") {
                    return;
                }

                data.insert_subject(action.value, body.user.id);

                // TODO: alert new theme

                await reload_home(client, body.user.id);
            },
        },
        {
            name: "reset-votes",
            run: async ({ ack, client, body }) => {
                await ack();

                data.reset_votes();
                await reload_home(client, body.user.id);
            },
        },
        {
            name: "delete-subject",
            run: async ({ ack, action, client, body }) => {
                await ack();

                if (action.type !== "button") {
                    return;
                }

                data.delete_subject(parseInt(action.value));
                await reload_home(client, body.user.id);
            },
        },
        {
            name: "choose-subject",
            run: async ({ ack, action, client, body }) => {
                await ack();

                if (action.type !== "button") {
                    return;
                }

                const subject = data.choose_subject(parseInt(action.value));
                if (subject == undefined) {
                    await reload_home(client, body.user.id);
                    return;
                }

                await client.chat.postMessage(
                    Message()
                        .channel(data.fishbowl_channel)
                        .text(
                            `${Md.bold("Começando daqui a pouco!")}\nTema escolhido: ${Md.bold(subject.subject)}\nClique ${Md.link(
                                data.fishbowl_meet,
                                "aqui"
                            )} para o meet e ${Md.link(data.fishbowl_pp, "aqui")} para a apresentação.`
                        )
                        .buildToObject()
                );

                await reload_home(client, body.user.id);
            },
        },
        {
            name: "send-topics",
            run: async ({ ack, action, client, body }) => {
                await ack();

                if (action.type !== "button") {
                    return;
                }

                await client.chat.postMessage(
                    Message()
                        .channel(data.fishbowl_channel)
                        .text(Md.bold("Tópicos do fishbowl, vote aqui <@fishbowlt>"))
                        .attachments(
                            Attachment()
                                .color("#57FA4B")
                                .blocks(Blocks.Section().text(Md.listBullet(data.get_subjects().map((s) => s.subject))))
                        )
                        .buildToObject()
                );

                await reload_home(client, body.user.id);
            },
        },
        {
            name: "toggle-show-votes",
            run: async ({ ack, action, client, body }) => {
                await ack();

                if (action.type !== "button") {
                    return;
                }

                data.set_show_votes(!data.show_votes());

                await reload_home(client, body.user.id);
            },
        },
        {
            name: "switch-vote",
            run: async ({ ack, action, client, body }) => {
                await ack();

                if (action.type !== "button") {
                    return;
                }

                const user_id = body.user.id;
                const subject_id = parseInt(action.value);
                const votes = data.get_votes(user_id);

                if (votes.includes(subject_id)) {
                    data.remove_vote(user_id, subject_id);
                } else {
                    data.add_vote(user_id, subject_id);
                }

                await reload_home(client, user_id);
            },
        },
    ],
};
