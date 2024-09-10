import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

router.post("/sign-up", async (req, res) => {
  const { Id, password, name, email } = req.body;

  if (!/^[a-z0-9]+$/.test(Id))
    return res.status(400).json({ message: "아이디는 영문 소문자와 숫자의 조합이어야 합니다." });

  if (password.length < 6)
    return res.status(400).json({ message: "비밀번호는 최소 6자리 이상이어야 합니다." });

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await prisma.users.create({
      data: { Id, password: hashedPassword, name, email },
    });
    res.status(200).json({ message: "회원가입에 성공하였습니다." });
  } catch (error) {
    res.status(400).json({
      message: "회원가입 실패하셨습니다. Id, password, name, email을 모두 작성해주세요. ",
    });
  }
});

router.post("/sign-in", async (req, res) => {
  const { Id, password } = req.body;

  try {
    const user = await prisma.users.findUnique({ where: { Id } });
    if (!user) return res.status(400).json({ message: "아이디가 일치하지 않습니다." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "비밀번호가 일치하지 않습니다." });

    const accessToken = jwt.sign({ userId: user.userId }, process.env.ACCESS_TOKEN_SECRET_KEY, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRATION,
    });
    res.cookie("authorization", `Bearer ${accessToken}`);

    res.status(200).json({ message: "정상적으로 로그인 되었습니다." });
  } catch (error) {
    res.status(400).json({ message: "로그인에 실패 하였습니다." });
  }
});

export default router;
