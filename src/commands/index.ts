import { Middleware, SlackAction, SlackActionMiddlewareArgs, SlackCommandMiddlewareArgs } from "@slack/bolt";

export interface ICommand {
    name: string;
    run: Middleware<SlackCommandMiddlewareArgs>;
    actions: IAction[];
}

export interface IAction {
    name: string;
    run: Middleware<SlackActionMiddlewareArgs<SlackAction>>;
}
