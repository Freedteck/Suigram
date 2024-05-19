import { Request, Response } from "express";
import { initializeZkLogin } from "../services/zkLogin.service";

export async function initializeZkLoginHandler(
    req: Request<{}, {}, {}>,
    res: Response
) {
    try {
        const userSessionData = await initializeZkLogin('Google')
        res.status(200).json({
            error:false,
            data: userSessionData
        })
    } catch(err: any) {
        res.status(500).json({
            error: true,
            message: err.message
        })
    } 
}