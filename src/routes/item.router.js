import express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

// 아이템 생성
router.post("/item", async (req, res) => {
  const { itemName, itemType, attack, str, dex, int, luk, itemInfo, itemPrice } = req.body;

  try {
    if (!itemName || !itemType) {
      return res.status(400).json({ message: "아이템 이름과 타입은 필수 항목입니다." });
    }

    const existingItem = await prisma.item.findUnique({
      where: { itemName },
    });

    if (existingItem) {
      return res.status(400).json({ message: "아이템 이름이 중복되었습니다." });
    }

    const newItem = await prisma.item.create({
      data: {
        itemName,
        itemType,
        attack: attack || null,
        str: str || null,
        dex: dex || null,
        int: int || null,
        luk: luk || null,
        itemInfo: itemInfo || null,
        itemPrice: itemPrice || null,
      },
    });

    res.status(201).json({ newItem, message: "아이템 생성에 성공하였습니다." });
  } catch (error) {
    res.status(400).json({ message: "아이템 생성에 실패하였습니다." });
  }
});

// 아이템 삭제
router.delete("/item/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const item = await prisma.item.findUnique({
      where: { itemId: +id },
    });

    if (!item) {
      return res.status(404).json({ message: "아이템을 찾을 수 없습니다." });
    }

    await prisma.item.delete({
      where: { itemId: +id },
    });

    res.status(200).json({ message: "아이템이 성공적으로 삭제되었습니다." });
  } catch (error) {
    res.status(400).json({ message: "아이템 삭제에 실패하였습니다." });
  }
});

export default router;
