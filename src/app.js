import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import usersRoutes from "./routes/users.routes.js";
import characterRoutes from "./routes/Character.routes.js";
import itmeRouter from "./routes/item.router.js";

dotenv.config();
const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api", usersRoutes);
app.use("/api", characterRoutes);
app.use("/api", itmeRouter);

app.listen(process.env.PORT, () => {
  console.log(`서버가 ${process.env.PORT} 포트에서 실행 중입니다.`);
});

export default app;
