import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 4000;

export const DB_CONFIG = {
    HOST: process.env.MYSQL_HOST,
    USER: process.env.MYSQL_USER,
    PASSWORD: process.env.MYSQL_PASSWORD,
    DATABASE: process.env.MYSQL_DATABASE,
    PORT: Number(process.env.MYSQL_PORT) || 3306
};
