import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 4000;

const dbName = process.env.MYSQL_DATABASE;
const productionDb = (dbName === "w2g" || !dbName) ? "railway" : dbName;

export const DB_CONFIG = {
    HOST: process.env.MYSQL_HOST,
    USER: process.env.MYSQL_USER,
    PASSWORD: process.env.MYSQL_PASSWORD,
    DATABASE: process.env.NODE_ENV === "production" ? productionDb : dbName,
    PORT: Number(process.env.MYSQL_PORT) || 3306
};
