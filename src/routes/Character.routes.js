import express from "express";
import dotenv from "dotenv";
import Middleware from "../middlewares/auth.middlewares.js";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

// 캐릭터 생성
router.post("/character-up", Middleware, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.userId;

  try {
    const existingCharacter = await prisma.character.findUnique({
      where: { name },
    });

    if (existingCharacter) {
      return res.status(400).json({ message: "이미 존재하는 닉네임 입니다." });
    }

    const character = await prisma.character.create({
      data: {
        name,
        userId,
      },
    });
    res.status(200).json({ character });
  } catch (error) {
    res.status(400).json({ message: "캐릭터 생성에 실패하였습니다." });
  }
});

// 캐릭터 삭제
router.delete("/character/:id", Middleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user ? req.user.userId : null;

  try {
    if (!req.user) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const character = await prisma.character.findUnique({
      where: { characterId: +id },
    });

    if (!character) {
      return res.status(404).json({ message: "존재하지 않는 캐릭터입니다." });
    }

    if (character.userId !== userId) {
      return res.status(403).json({ message: "본인의 캐릭터가 아닙니다." });
    }
    await prisma.character.delete({
      where: { characterId: +id },
    });

    res.status(200).json({ message: "캐릭터가 정상적으로 삭제되었습니다." });
  } catch (error) {
    res.status(400).json({ message: "캐릭터 삭제에 실패하였습니다." });
  }
});

// 로그인하지 않았을 때 캐릭터 조회
router.get("/character/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const character = await prisma.character.findUnique({
      where: { characterId: +id },
      select: {
        name: true,
      },
    });

    if (!character) {
      return res.status(404).json({ message: "캐릭터를 찾을 수 없습니다." });
    }

    res.status(200).json({ name: character.name });
  } catch (error) {
    res.status(400).json({ message: "캐릭터 조회에 실패하였습니다." });
  }
});

// 로그인했을 때 캐릭터 조회
router.get("/my-character/:id", Middleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user ? req.user.userId : null;

  try {
    if (!req.user) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const character = await prisma.character.findUnique({
      where: { characterId: +id },
    });

    if (!character) {
      return res.status(404).json({ message: "캐릭터를 찾을 수 없습니다." });
    }

    if (character.userId !== userId) {
      return res.status(403).json({ message: "본인의 캐릭터가 아닙니다." });
    }

    res.status(200).json({ character });
  } catch (error) {
    res.status(400).json({ message: "캐릭터 조회에 실패하였습니다." });
  }
});

export default router;
