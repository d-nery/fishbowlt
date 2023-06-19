import { Middleware, SlackEventMiddlewareArgs } from "@slack/bolt";
import { IAction } from "../commands";

export * from "./home";

export interface IEvent {
    name: string;
    run: Middleware<SlackEventMiddlewareArgs<string>>;
    actions: IAction[];
}
