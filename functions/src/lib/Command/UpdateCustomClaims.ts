import { IActionableFieldCommand } from ".";
import User from "../ORM/Models/User";
import * as admin from 'firebase-admin'

export default class UpdateCustomClaims implements IActionableFieldCommand {
    
    async execute(user: User, claims: any): Promise<void>
    {
        return admin.auth().setCustomUserClaims(user.getId(), claims)
    }
    
    undo(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}