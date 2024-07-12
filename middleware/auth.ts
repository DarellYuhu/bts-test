import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";

const auth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const payload = verify(token, "VERY_SECRET_KEY");
  if (!payload) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export default auth;
