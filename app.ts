import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import { Prisma, PrismaClient } from "@prisma/client";
import { compare, hash } from "bcrypt";
import { sign } from "jsonwebtoken";
import auth from "./middleware/auth";

const app = express();
const prisma = new PrismaClient();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello World!" });
});

// login api
app.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ message: "User not found" });
    const isValid = await compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: "Invalid password" });
    const payload = {
      id: user.id,
      username: user.username,
    };
    const token = sign(payload, "VERY_SECRET_KEY");
    return res.json({ message: "success", token });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error });
  }
});

// registration api
app.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    const hashed = await hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashed,
      },
      omit: {
        password: true,
      },
    });
    return res.json({ message: "success", user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return res.status(409).json({ message: "User already exists" });
      }
    }
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error", error });
  }
});

// create checklist
app.post("/checklist", auth, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const checklist = await prisma.checklist.create({
      data: {
        name,
      },
    });
    return res.json({ message: "success", checklist });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error });
  }
});

// get all
app.get("/checklist", auth, async (req: Request, res: Response) => {
  try {
    const checklist = await prisma.checklist.findMany();
    return res.json({ message: "success", checklist });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error });
  }
});

// delete checklist
app.delete(
  "/checklist/:checklistId",
  auth,
  async (req: Request, res: Response) => {
    try {
      const { checklistId } = req.params;
      const checklist = await prisma.checklist.delete({
        where: {
          id: Number(checklistId),
        },
      });
      return res.json({ message: "success", checklist });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return res.status(404).json({ message: "Checklist not found" });
        }
      }
      return res.status(500).json({ message: "Internal Server Error", error });
    }
  }
);

// create checklist item
app.post(
  "/checklist/:checklistId/item",
  auth,
  async (req: Request, res: Response) => {
    try {
      const { itemName } = req.body;
      const { checklistId } = req.params;
      const checklist = await prisma.checklistItem.create({
        data: {
          itemName,
          checklistId: Number(checklistId),
        },
      });
      return res.json({ message: "success", checklist });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          return res.status(404).json({ message: "Checklist not found" });
        }
      }
      return res.status(500).json({ message: "Internal Server Error", error });
    }
  }
);

// get all checklist item
app.get(
  "/checklist/:checklistId/item",
  auth,
  async (req: Request, res: Response) => {
    try {
      const { checklistId } = req.params;
      const checklist = await prisma.checklistItem.findMany({
        where: {
          checklistId: Number(checklistId),
        },
      });
      return res.json({ message: "success", checklist });
    } catch (error) {
      return res.status(500).json({ message: "Internal Server Error", error });
    }
  }
);

// get all checklist item by checklist id
app.get(
  "/checklist/:checklistId/item/:checklistItemId",
  auth,
  async (req: Request, res: Response) => {
    try {
      const { checklistId, checklistItemId } = req.params;
      const checklist = await prisma.checklistItem.findUnique({
        where: {
          checklistId: Number(checklistId),
          id: Number(checklistItemId),
        },
      });
      return res.json({ message: "success", checklist });
    } catch (error) {
      return res.status(500).json({ message: "Internal Server Error", error });
    }
  }
);

// update status
app.put(
  "/checklist/:checklistId/item/:checklistItemId",
  auth,
  async (req: Request, res: Response) => {
    try {
      const { checklistId, checklistItemId } = req.params;
      const data = await prisma.$transaction(async (prisma) => {
        const item = await prisma.checklistItem.findUnique({
          where: {
            checklistId: Number(checklistId),
            id: Number(checklistItemId),
          },
        });
        console.log(item?.status);
        const checklist = await prisma.checklistItem.update({
          where: {
            checklistId: Number(checklistId),
            id: Number(checklistItemId),
          },
          data: {
            status: !item?.status,
          },
        });
        return checklist;
      });
      return res.json({ message: "success", checklist: data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return res.status(404).json({ message: "Checklist not found" });
        }
      }
      return res.status(500).json({ message: "Internal Server Error", error });
    }
  }
);

// delete checklist item
app.delete(
  "/checklist/:checklistId/item/:checklistItemId",
  auth,
  async (req: Request, res: Response) => {
    try {
      const { checklistId, checklistItemId } = req.params;
      const checklist = await prisma.checklistItem.delete({
        where: {
          checklistId: Number(checklistId),
          id: Number(checklistItemId),
        },
      });
      return res.json({ message: "success", checklist });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return res.status(404).json({ message: "Checklist not found" });
        }
      }
      return res.status(500).json({ message: "Internal Server Error", error });
    }
  }
);

// rename item
app.put(
  "/checklist/:checklistId/item/rename/:checklistItemId",
  auth,
  async (req: Request, res: Response) => {
    try {
      const { checklistId, checklistItemId } = req.params;
      const { itemName } = req.body;
      const checklist = await prisma.checklistItem.update({
        where: {
          checklistId: Number(checklistId),
          id: Number(checklistItemId),
        },
        data: {
          itemName,
        },
      });
      return res.json({ message: "success", checklist });
    } catch (error) {
      return res.status(500).json({ message: "Internal Server Error", error });
    }
  }
);

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
