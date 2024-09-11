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

    // 내가 만드는 캐릭터의 닉네임이 이미 존재할 때
    if (existingCharacter) {
      return res.status(400).json({ message: "이미 존재하는 닉네임 입니다." });
    }

    const character = await prisma.character.create({
      data: {
        name,
        userId,
      },
    });
    res.status(200).json({ character, message: "캐릭터가 정상적으로 생성이 완료되었습니다." });
  } catch (error) {
    res.status(400).json({ message: "캐릭터 생성에 실패하였습니다." });
  }
});

// 캐릭터 삭제
router.delete("/character/:id", Middleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user ? req.user.userId : null;

  try {
    // 로그인을 하지 않고 캐릭터 삭제를 했을 때
    if (!req.user) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const character = await prisma.character.findUnique({
      where: { characterId: +id },
    });

    // 삭제 요청한 캐릭터가 존재 하지 않을 때
    if (!character) {
      return res.status(404).json({ message: "존재하지 않는 캐릭터입니다." });
    }
    // 내 캐릭터가 아닌 다른 사람의 캐릭터 ID를 삭제 할 때
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
        characterId: true,
        name: true,
      },
    });
    // 캐릭터가 존재 하지 않을 때
    if (!character) {
      return res.status(404).json({ message: "요청하신 캐릭터가 존재하지 않습니다." });
    }

    res.status(200).json({ characterId: character.characterId, name: character.name });
  } catch (error) {
    res.status(400).json({ message: "캐릭터 조회에 실패하였습니다." });
  }
});

// 로그인했을 때 캐릭터 조회
router.get("/my-character/:id", Middleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user ? req.user.userId : null;

  try {
    // 상세조회를 하는데 로그인이 되어있지 않을 때
    if (!req.user) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const character = await prisma.character.findUnique({
      where: { characterId: +id },
    });
    // 요청한 캐릭터ID가 존재하지 않을 때
    if (!character) {
      return res.status(404).json({ message: "요청하신 캐릭터가 존재하지 않습니다." });
    }
    // 요청한 캐릭터ID가 내 캐릭터가 아닐 때
    if (character.userId !== userId) {
      return res.status(403).json({ message: "본인의 캐릭터가 아닙니다." });
    }

    res.status(200).json({ character });
  } catch (error) {
    res.status(400).json({ message: "캐릭터 조회에 실패하였습니다." });
  }
});

export default router;
