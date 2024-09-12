import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import usersRoutes from "./routes/users.routes.js";
import characterRoutes from "./routes/Character.routes.js";
import itemRouter from "./routes/item.router.js";
import inventoryRouter from "./routes/inventory.router.js";
import equimentRouter from "./routes/equiment.router.js";

dotenv.config();
const app = express();
const PORT = 1019;

app.use(express.json());
app.use(cookieParser());

app.use("/api", usersRoutes);
app.use("/api", characterRoutes);
app.use("/api", itemRouter);
app.use("/api", inventoryRouter);
app.use("/api", equimentRouter);

app.listen(PORT, () => {
  console.log(`서버가 ${PORT} 포트에서 실행 중입니다.`);
});

export default app;
