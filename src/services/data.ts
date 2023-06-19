import fs from "node:fs";
import _ from "underscore";

type Subject = {
    id: number;
    subject: string;
    author: string;
    votes: number;
};

type Data = {
    subjects: Subject[];
    pastSubjects: string[];
    voted: Map<string, number[]>;
    lastId: number;
    showVotes: boolean;
};

const replacer = (key: any, value: any) => {
    if (value instanceof Map) {
        return {
            dataType: "Map",
            value: [...value],
        };
    }

    return value;
};

const reviver = (key: any, value: any) => {
    if (typeof value === "object" && value !== null) {
        if (value.dataType === "Map") {
            return new Map(value.value);
        }
    }
    return value;
};

if (!fs.existsSync("db.json")) {
    fs.writeFileSync(
        "db.json",
        JSON.stringify(
            {
                pastSubjects: [],
                subjects: [],
                voted: new Map(),
                lastId: 0,
                showVotes: false,
            } as Data,
            replacer,
            4
        ),
        { encoding: "utf-8" }
    );
}

const db: Data = JSON.parse(fs.readFileSync("db.json", { encoding: "utf-8" }), reviver);
const save = () => {
    fs.writeFileSync("db.json", JSON.stringify(db, replacer, 4), { encoding: "utf-8" });
};

const admins = process.env.FISHBOWL_ADMINS?.split(",") ?? [];
const fishbowl_channel = process.env.FISHBOWL_CHANNEL ?? "";
const fishbowl_meet = process.env.FISHBOWL_MEET ?? "";

const insert_subject = (subject: string, author: string) => {
    db.subjects.push({
        author: author,
        id: db.lastId + 1,
        subject: subject,
        votes: 0,
    });

    db.lastId += 1;
    save();
};

const delete_subject = (id: number) => {
    db.subjects = _.reject(db.subjects, (s) => s.id == id);

    for (const [k, v] of db.voted.entries()) {
        db.voted.set(
            k,
            _.reject(v, (s) => s == id)
        );
    }

    save();
};

const choose_subject = (id: number) => {
    const subject = _.find(db.subjects, (s) => s.id == id);
    delete_subject(id);

    if (subject != undefined) {
        db.pastSubjects.push(subject.subject);
        save();
    }

    return subject;
};

const get_subjects = () => {
    return [...db.subjects];
};

const reset_votes = () => {
    for (const subject of db.subjects) {
        subject.votes = 0;
    }

    db.voted = new Map();

    save();
};

const get_votes = (user: string) => {
    return db.voted.get(user) ?? [];
};

const add_vote = (user: string, subjectId: number) => {
    const userVotes = db.voted.get(user) ?? [];
    if (userVotes.length >= 3) {
        return false;
    }

    userVotes.push(subjectId);
    db.voted.set(user, userVotes);
    db.subjects.find((s) => s.id == subjectId)!.votes += 1;
    save();
    return true;
};

const remove_vote = (user: string, subjectId: number) => {
    const userVotes = db.voted.get(user) ?? [];

    db.voted.set(
        user,
        _.reject(userVotes, (v) => v == subjectId)
    );

    db.subjects.find((s) => s.id == subjectId)!.votes -= 1;
    save();
    return true;
};

const past_subjects = () => db.pastSubjects;
const show_votes = () => db.showVotes;
const set_show_votes = (show_votes: boolean) => {
    db.showVotes = show_votes;
    save();
};
export default {
    admins,
    fishbowl_channel,
    fishbowl_meet,
    insert_subject,
    choose_subject,
    delete_subject,
    get_subjects,
    show_votes,
    past_subjects,
    reset_votes,
    get_votes,
    add_vote,
    remove_vote,
    set_show_votes,
};
