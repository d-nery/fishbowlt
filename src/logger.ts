import "@colors/colors";

import { Logger as BoltLogger, LogLevel } from "@slack/bolt";
import winston from "winston";

export const logger = winston.createLogger({
    level: "debug",
    format: winston.format.combine(
        winston.format((info) => (info.supress ? false : info))(),
        winston.format((info) => {
            info.level = info.level.toUpperCase();
            return info;
        })(),
        winston.format.cli(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...data }) => {
            let msg = `${timestamp} ${level} ${message}`;

            for (const [k, v] of Object.entries(data)) {
                msg += `\t${k.magenta}=${v}`;
            }

            return msg;
        })
    ),
    transports: [new winston.transports.Console()],
});

// Helper class for Bolt, logger should just be used directly everywhere else
export class Logger implements BoltLogger {
    debug(...msg: any[]): void {
        logger.debug(msg[0], { supress: true });
    }

    info(...msg: any[]): void {
        logger.info(msg);
    }

    warn(...msg: any[]): void {
        logger.warn(msg);
    }

    error(...msg: any[]): void {
        logger.error(msg);
    }

    setLevel(level: LogLevel): void {}

    getLevel(): LogLevel {
        return LogLevel.INFO;
    }

    setName(name: string): void {}
}
