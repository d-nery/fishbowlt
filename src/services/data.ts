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
    articles: Subject[];
    pastSubjects: string[];
    voted: Map<string, number[]>;
    lastId: number;
    showVotes: boolean;
    showArticles: boolean;
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
                articles: [],
                voted: new Map(),
                lastId: 0,
                showVotes: false,
                showArticles: false,
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
const fishbowl_pp = process.env.FISHBOWL_PP ?? "";

const insert_subject = (subject: string, author: string) => {
    if (db.showArticles) {
        db.articles.push({
            author: author,
            id: db.lastId + 1,
            subject: subject,
            votes: 0,
        });
    } else {
        db.subjects.push({
            author: author,
            id: db.lastId + 1,
            subject: subject,
            votes: 0,
        });
    }

    db.lastId += 1;
    save();
};

const delete_subject = (id: number) => {
    db.subjects = _.reject(db.subjects, (s) => s.id == id);
    db.articles = _.reject(db.articles, (s) => s.id == id);

    for (const [k, v] of db.voted.entries()) {
        db.voted.set(
            k,
            _.reject(v, (s) => s == id)
        );
    }

    save();
};

const choose_subject = (id: number) => {
    const subject = _.find(db.subjects, (s) => s.id == id) ?? _.find(db.articles, (s) => s.id == id);
    delete_subject(id);

    if (subject != undefined) {
        db.pastSubjects.push(subject.subject);
        save();
    }

    return subject;
};

const get_subjects = () => {
    return db.showArticles ? [...db.articles] : [...db.subjects];
};

const reset_votes = () => {
    for (const subject of db.subjects) {
        subject.votes = 0;
    }

    for (const subject of db.articles) {
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

    if (db.showArticles){
        db.articles.find((s) => s.id == subjectId)!.votes += 1;
    } else {
        db.subjects.find((s) => s.id == subjectId)!.votes += 1;
    }

    save();
    return true;
};

const remove_vote = (user: string, subjectId: number) => {
    const userVotes = db.voted.get(user) ?? [];

    db.voted.set(
        user,
        _.reject(userVotes, (v) => v == subjectId)
    );

    if (db.showArticles){
        db.articles.find((s) => s.id == subjectId)!.votes -= 1;
    } else {
        db.subjects.find((s) => s.id == subjectId)!.votes -= 1;
    }
    save();
    return true;
};

const past_subjects = () => db.pastSubjects;
const show_votes = () => db.showVotes;
const show_articles = () => db.showArticles;
const set_show_votes = (show_votes: boolean) => {
    db.showVotes = show_votes;
    save();
};

const set_show_articles = (show_articles: boolean) => {
    db.showArticles = show_articles;
    save();
};
export default {
    admins,
    fishbowl_channel,
    fishbowl_meet,
    fishbowl_pp,
    insert_subject,
    choose_subject,
    delete_subject,
    get_subjects,
    show_votes,
    show_articles,
    past_subjects,
    reset_votes,
    get_votes,
    add_vote,
    remove_vote,
    set_show_votes,
    set_show_articles,
};
