import express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

// 아이템 생성
router.post("/item", async (req, res) => {
  const {
    itemName, // 아이템 이름
    itemType, // 아이템 타입 지정 (TYPE1 ~ TYPE5)
    itemRating, // 아이템 등급 지정 (그냥 느낌 나게 추가 !)
    attack, // 아이템 공격력
    str, // 아이템 스탯 힘
    dex, // 아이템 스탯 덱스
    int, // 아이템 스탯 인트
    luk, // 아이템 스탯 럭
    itemInfo, // 아이템 설명 지정
    itemPrice, // 아이템 가격 지정
    itemCode, // 아이템 코드 지정 (인벤토리 아이템 생성할 때 사용)
  } = req.body;

  try {
    if (!itemName || !itemType || !itemRating || itemCode === undefined) {
      return res
        .status(400)
        .json({ message: "아이템 이름, 타입, 코드 , 등급지정은 필수로 입력 하셔야 합니다." });
    }

    // 아이템 이름 중복 확인 (같은 이름의 아이템을 만들수 없다. 중복 x)
    const existingItemByName = await prisma.item.findUnique({
      where: { itemName },
    });

    if (existingItemByName) {
      return res.status(400).json({ message: "아이템 이름이 중복되었습니다." });
    }

    // 아이템 코드 조회 (아이템 코드는 중복이 될 수 없다. )
    const existingItemByCode = await prisma.item.findUnique({
      where: { itemCode },
    });

    if (existingItemByCode) {
      return res.status(400).json({ message: "아이템 코드가 중복되었습니다." });
    }

    const newItem = await prisma.item.create({
      data: {
        itemName,
        itemType,
        itemRating,
        itemCode,
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

// 모든 아이템 조회 (생성한 모든 아이템 조회)
router.get("/items", async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      select: {
        itemId: true,
        itemName: true,
        itemType: true,
        itemRating: true,
        itemInfo: true,
        itemCode: true,
      },
    });

    res.status(200).json(items);
  } catch (error) {
    res.status(400).json({ message: "아이템 목록을 불러오는 데 실패하였습니다." });
  }
});

// 해당 아이디로 아이템 조회 (특정 아이템의 ID값으로 해당하는 아이템만 조회)
router.get("/item/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const item = await prisma.item.findUnique({
      where: { itemId: +id },
      select: {
        itemId: true,
        itemName: true,
        itemType: true,
        itemRating: true,
        itemInfo: true,
        itemCode: true,
        item,
      },
    });

    if (!item) {
      return res.status(404).json({ message: "해당 ID값의 아이템이 존재 하지 않습니다." });
    }

    res.status(200).json(item);
  } catch (error) {
    res.status(400).json({ message: "아이템 정보를 불러오는 데 실패하였습니다." });
  }
});

// 아이템 정보 수정
router.put("/item/:id", async (req, res) => {
  const { id } = req.params;
  const { itemName, attack, str, dex, int, luk, itemRating, itemInfo } = req.body;

  try {
    // 요청 ID의 아이템 존재하는지 확인
    const AmendItem = await prisma.item.findUnique({
      where: { itemId: +id },
    });

    if (!AmendItem) {
      return res.status(404).json({ message: "해당 ID의 아이템이 존재하지 않습니다." });
    }

    // 아이템 정보 수정 (여기서 수정 된 값이 없으면 기존데이터 사용)
    const updateItem = await prisma.item.update({
      where: { itemId: +id },
      data: {
        itemName: itemName || AmendItem.itemName,
        itemRating: itemRating || AmendItem.itemRating,
        attack: attack !== undefined ? attack : null, // 값을 할당하지 않으면 null 할당
        str: str !== undefined ? str : null, // 값을 할당하지 않으면 null 할당
        dex: dex !== undefined ? dex : null, // 값을 할당하지 않으면 null 할당
        int: int !== undefined ? int : null, // 값을 할당하지 않으면 null 할당
        luk: luk !== undefined ? luk : null, // 값을 할당하지 않으면 null 할당
        itemInfo: itemInfo || AmendItem.itemInfo,
      },
    });

    res
      .status(200)
      .json({ updateItem, message: "변경한 아이템 정보가 정상적으로 변경되었습니다." });
  } catch (error) {
    res.status(400).json({ message: "아이템 정보 수정에 실패하였습니다." });
  }
});

export default router;
