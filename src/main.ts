import { SLBot } from "./bot";
import { HomeTabEvent } from "./events";

const bot = new SLBot(process.env.SLACK_BOT_TOKEN!, process.env.SLACK_SIGNING_SECRET!, process.env.SLACK_APP_TOKEN!);

bot.addEvent(HomeTabEvent);

bot.start(process.env.PORT).catch((e) => console.error(e));
