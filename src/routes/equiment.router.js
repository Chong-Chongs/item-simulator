import express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import Middleware from "../middlewares/auth.middlewares.js";

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

router.use(Middleware);

// 장비 장착
router.put("/equipment/:characterId/equip", async (req, res) => {
  const { characterId } = req.params;
  const { inventoryNumber } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    // 본인 캐릭터인지 확인
    const character = await prisma.character.findUnique({
      where: { characterId: +characterId },
    });

    if (!character || character.userId !== userId) {
      return res.status(403).json({ message: "본인의 캐릭터만 장착할 수 있습니다." });
    }

    // 인벤토리에서 아이템 조회 (inventoryNumber로 아이템 장착가능)
    const inventoryItem = await prisma.inventory.findUnique({
      where: {
        characterId_inventoryNumber: {
          characterId: +characterId,
          inventoryNumber: +inventoryNumber,
        },
      },
    });

    // 요청한 인벤토리 슬롯넘버에 아이템이 없을시
    if (!inventoryItem) {
      return res.status(404).json({ message: "해당 인벤토리 슬롯에 아이템이 없습니다." });
    }

    // 같은 타입의 장비가 장착 되어있는지 확인 (같은 타입 중복 착용 불가.)
    const existingEquipment = await prisma.equipment.findFirst({
      where: {
        characterId: +characterId,
        itemType: inventoryItem.itemType,
      },
    });

    if (existingEquipment) {
      return res.status(400).json({ message: "같은 타입의 아이템이 이미 장착되어 있습니다." });
    }

    // 인벤토리에서 장비창으로 생성 / 장착
    const newEquipment = await prisma.equipment.create({
      data: {
        userId,
        characterId: +characterId,
        itemId: inventoryItem.itemId,
        itemName: inventoryItem.itemName,
        itemType: inventoryItem.itemType,
        itemCode: inventoryItem.itemCode,
        attack: inventoryItem.attack,
        str: inventoryItem.str,
        dex: inventoryItem.dex,
        int: inventoryItem.int,
        luk: inventoryItem.luk,
        itemRating: inventoryItem.itemRating,
      },
    });

    // 장비 장착 후 캐릭터 스탯 업데이트
    await prisma.character.update({
      where: { characterId: +characterId },
      data: {
        attack: { increment: newEquipment.attack || 0 },
        str: { increment: newEquipment.str || 0 },
        dex: { increment: newEquipment.dex || 0 },
        int: { increment: newEquipment.int || 0 },
        luk: { increment: newEquipment.luk || 0 },
      },
    });

    // 아이템 정상적으로 장착후 인벤토리에서 삭제 후 슬롯 이동
    await prisma.inventory.delete({
      where: {
        characterId_inventoryNumber: {
          characterId: +characterId,
          inventoryNumber: +inventoryNumber,
        },
      },
    });

    // 장착 후 뒤에 있던 아이템들 슬롯 넘버 앞으로 이동
    const inventoryItems = await prisma.inventory.findMany({
      where: {
        characterId: +characterId,
        inventoryNumber: {
          gt: +inventoryNumber,
        },
      },
    });

    for (const item of inventoryItems) {
      await prisma.inventory.update({
        where: {
          characterId_inventoryNumber: {
            characterId: +characterId,
            inventoryNumber: item.inventoryNumber,
          },
        },
        data: {
          inventoryNumber: item.inventoryNumber - 1,
        },
      });
    }

    res.status(200).json({ message: "아이템이 정상적으로 착용이 완료되었습니다." });
  } catch (error) {
    res.status(400).json({ message: "아이템 장착에 실패하였습니다." });
  }
});

// 장비 해제
router.put("/equipment/:characterId/unequip", async (req, res) => {
  const { characterId } = req.params;
  const { itemType } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    const [equipment, character] = await prisma.$transaction([
      prisma.equipment.findFirst({
        where: {
          characterId: +characterId,
          itemType: itemType,
        },
      }),
      prisma.character.findUnique({
        where: { characterId: +characterId },
      }),
    ]);

    // 요청한 캐릭터ID가 존재 하지 않는다면
    if (!character) {
      return res.status(404).json({ message: "요청하신 캐릭터를 찾을수 없습니다." });
    }
    // 요청한 타입의 장비를 장착 하고 있지 않다면
    if (!equipment) {
      return res.status(404).json({ message: "해당 타입의 장비를 장착하고 있지 않습니다." });
    }
    // 로그인 했을 때 요청한 캐릭터가 자신의 캐릭터가 아닐경우
    if (character.userId !== userId) {
      return res.status(403).json({ message: "본인의 캐릭터의 장비만 해제 가능합니다." });
    }

    // 장착한 장비 해제 후 캐릭터 아이템 스탯 적용 해제
    await prisma.character.update({
      where: { characterId: +characterId },
      data: {
        attack: { decrement: equipment.attack || 0 },
        str: { decrement: equipment.str || 0 },
        dex: { decrement: equipment.dex || 0 },
        int: { decrement: equipment.int || 0 },
        luk: { decrement: equipment.luk || 0 },
      },
    });

    // 장비를 정상적으로 해제 했을 경우 다시 인벤토리 슬롯에 추가
    const inventorySlots = await prisma.inventory.findMany({
      where: { characterId: +characterId },
      orderBy: { inventoryNumber: "asc" },
    });

    let availableSlot = 1;
    for (const slot of inventorySlots) {
      if (slot.inventoryNumber === availableSlot) {
        availableSlot++;
      } else {
        break;
      }
    }

    // 해제 후 장비 테이블에서 인벤토리 테이블로 생성 / 삭제
    await prisma.inventory.create({
      data: {
        userId,
        characterId: +characterId,
        inventoryNumber: availableSlot,
        itemId: equipment.itemId,
        itemName: equipment.itemName,
        itemType: equipment.itemType,
        itemCode: equipment.itemCode,
        attack: equipment.attack,
        str: equipment.str,
        dex: equipment.dex,
        int: equipment.int,
        luk: equipment.luk,
        itemRating: equipment.itemRating,
      },
    });

    // 장비 테이블에서 장비 삭제
    await prisma.equipment.delete({
      where: {
        equipmentId: equipment.equipmentId,
      },
    });

    res.status(200).json({ message: "해당 타입의 아이템이 정상적으로 해제가 되었습니다." });
  } catch (error) {
    console.error("장비 해제 오류:", error);
    res.status(400).json({ message: "아이템 해제에 실패하였습니다." });
  }
});

// 캐릭터 장착 장비 조회
router.get("/equipment/:characterId", async (req, res) => {
  const { characterId } = req.params;
  const userId = req.user?.userId;

  // 로그인을 하지 않고 조회를 할 때
  if (!userId) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    const character = await prisma.character.findUnique({
      where: { characterId: +characterId },
    });

    // 요청한 캐릭터가 나의 캐릭터가 아닐 때
    if (!character || character.userId !== userId) {
      return res.status(403).json({ message: "본인의 캐릭터만 조회할 수 있습니다." });
    }

    // 캐릭터가 장착하고 있는 아이템 조회
    const equipment = await prisma.equipment.findMany({
      where: { characterId: +characterId },
      orderBy: { itemType: "asc" },
    });

    // 캐릭터가 아이템을 장착하고 있지 않을 때
    if (equipment.length === 0) {
      return res.status(404).json({ message: "캐릭터가 장착하고 있는 아이템이 없습니다." });
    }

    res.status(200).json({ equipment });
  } catch (error) {
    console.error("장비 조회 오류:", error);
    res.status(400).json({ message: "장비 조회에 실패하였습니다." });
  }
});

export default router;
