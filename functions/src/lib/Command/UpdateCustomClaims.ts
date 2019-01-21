import { IActionableFieldCommand } from ".";
import User from "../ORM/Models/User";
import { auth } from 'firebase-admin'
export default class UpdateCustomClaims implements IActionableFieldCommand {
    
    async execute(user: User, changes: any, claims: any): Promise<void>
    {
        return await auth().setCustomUserClaims(user.getId(), claims)
        // return auth().revokeRefreshTokens(user.getId())
    }
    
    undo(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}