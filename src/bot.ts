import "./env";
import { App, BlockAction, ButtonAction } from "@slack/bolt";
import { ICommand } from "./commands";
import { Logger, logger } from "./logger";
import { IEvent } from "./events";

export class SLBot {
    private readonly app: App;
    private readonly commands: ICommand[] = [];
    private readonly events: IEvent[] = [];

    constructor(token: string, signingSecret: string, appToken: string) {
        this.app = new App({
            token,
            signingSecret,
            appToken,
            socketMode: true,
            logger: new Logger(),
        });
    }

    addCommand(command: ICommand) {
        this.commands.push(command);
    }

    addEvent(event: IEvent) {
        this.events.push(event);
    }

    async start(port?: string | number) {
        this.registerMiddlewares();
        this.registerEvents();
        this.registerCommands();

        this.app.error(async (e) => console.error(e));

        await this.app.start(port ?? 3000);
    }

    private registerCommands() {
        for (const cmd of this.commands) {
            this.app.command(cmd.name, cmd.run);

            for (const action of cmd.actions) {
                this.app.action(action.name, action.run);
            }
        }
    }

    private registerMiddlewares() {
        this.app.command(/\/.*/, async ({ command }) => {
            logger.debug("Command Received", { name: command.command, by: command.user_name });
        });

        this.app.action(/.*/, async ({ action, body }) => {
            const interaction = action as ButtonAction;
            const block = body as BlockAction;
            logger.debug("Action Received", { name: interaction.action_id, by: block.user.name });
        });

        this.app.event(/.*/, async ({ event }) => {
            logger.debug("Event Received", { type: event.type });
        });
    }

    private registerEvents() {
        for (const evt of this.events) {
            this.app.event(evt.name, evt.run);

            for (const action of evt.actions) {
                this.app.action(action.name, action.run);
            }
        }
    }
}
