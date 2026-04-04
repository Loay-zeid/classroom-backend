import arcjet from "@arcjet/node";

if(!process.env.ARCJET_KEY && process.env.NODE_ENV !== 'test') {
    throw new Error('ARCJET_KEY environment is required');
}


const isDev =
    process.env.NODE_ENV !== "production" ||
    process.env.ARCJET_ENV === "development";

const aj = arcjet({
    key: process.env.ARCJET_KEY!,
    rules: [],
});

export default aj;
