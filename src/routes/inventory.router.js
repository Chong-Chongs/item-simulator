import express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import Middleware from "../middlewares/auth.middlewares.js";

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

router.use(Middleware);

// 인벤토리 아이템 생성
router.post("/inventory/:characterId/add", async (req, res) => {
  const { characterId } = req.params;
  const { itemCode } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    const character = await prisma.character.findUnique({
      where: { characterId: +characterId },
    });

    if (!character || character.userId !== userId) {
      return res.status(403).json({ message: "본인의 캐릭터만 수정할 수 있습니다." });
    }

    const item = await prisma.item.findUnique({
      where: { itemCode: +itemCode },
    });

    if (!item) {
      return res.status(404).json({ message: "아이템을 찾을 수 없습니다." });
    }

    const inventoryCount = await prisma.inventory.count({
      where: { characterId: +characterId },
    });

    // 캐릭터의 최대 인벤토리 슬롯 수
    const maxInventorySlots = character.inventorySlot;

    if (inventoryCount >= maxInventorySlots) {
      return res.status(400).json({ message: "인벤토리 슬롯이 꽉 차있습니다." });
    }

    const newInventoryItem = await prisma.inventory.create({
      data: {
        userId,
        characterId: +characterId,
        inventoryNumber: inventoryCount + 1,
        itemId: item.itemId,
        itemName: item.itemName,
        itemRating: item.itemRating,
        itemType: item.itemType,
        itemCode: item.itemCode,
        attack: item.attack,
        str: item.str,
        dex: item.dex,
        int: item.int,
        luk: item.luk,
      },
    });

    res.status(201).json({ newInventoryItem, message: "아이템이 인벤토리에 추가되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "아이템 추가에 실패하였습니다." });
  }
});

// 인벤토리 아이템 삭제
router.delete("/inventory/:characterId/:inventoryNumber/delete", async (req, res) => {
  const { characterId, inventoryNumber } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    const character = await prisma.character.findUnique({
      where: { characterId: +characterId },
    });

    if (!character || character.userId !== userId) {
      return res.status(403).json({ message: "본인의 캐릭터만 수정할 수 있습니다." });
    }

    const inventoryItem = await prisma.inventory.findUnique({
      where: {
        characterId_inventoryNumber: {
          characterId: +characterId,
          inventoryNumber: +inventoryNumber,
        },
      },
    });

    if (!inventoryItem) {
      return res.status(404).json({ message: "해당 슬롯에 아이템이 존재하지 않습니다." });
    }

    // 삭제할 아이템
    await prisma.inventory.delete({
      where: {
        characterId_inventoryNumber: {
          characterId: +characterId,
          inventoryNumber: +inventoryNumber,
        },
      },
    });

    // 중간 슬롯의 아이템이 삭제되었을 때 상위슬롯에 있던 아이템이 자동으로 하위 슬롯으로 이동
    await prisma.inventory.updateMany({
      where: {
        characterId: +characterId,
        inventoryNumber: { gt: +inventoryNumber },
      },
      data: { inventoryNumber: { decrement: 1 } },
    });

    res.status(200).json({ message: "아이템이 인벤토리에서 삭제되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "아이템 삭제에 실패하였습니다." });
  }
});

// 인벤토리 조회
router.get("/inventory/:characterId", async (req, res) => {
  const { characterId } = req.params;
  const userId = req.user?.userId;

  // 로그인 하지 않고 인벤토리를 조회 할 경우
  if (!userId) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    const character = await prisma.character.findUnique({
      where: { characterId: +characterId },
    });

    // 로그인 후 내 캐릭터가 아닌 다른 사람의 캐릭터 아이디를 조회 했을 경우
    if (!character || character.userId !== userId) {
      return res.status(403).json({ message: "본인의 캐릭터만 조회할 수 있습니다." });
    }

    const inventoryItems = await prisma.inventory.findMany({
      where: { characterId: +characterId },
      orderBy: { inventoryNumber: "asc" },
    });

    res.status(200).json({ inventoryItems });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "인벤토리 조회에 실패하였습니다." });
  }
});

export default router;
