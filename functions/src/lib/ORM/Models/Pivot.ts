import { Change } from "firebase-functions";
import ModelImpl from "./";

export default class Pivot extends ModelImpl {

    owner: ModelImpl
    property: ModelImpl

    constructor(db: FirebaseFirestore.Firestore, owner: ModelImpl, property: ModelImpl, path?: string)
    {
        if(path)
        {
            super('name', db)
        }
        else
        {
            const name = [owner.name, property.name].sort().join('_')
            super(name, db)

            this.owner = owner
            this.property = property    
        }
    }
    
    async getId(): Promise<string>
    {
        return [{
            name: this.owner.name,
            id: await this.owner.getId()
        },{
            name: this.property.name,
            id: await this.property.getId()
        }].sort((A, B) => {
            if (A.name < B.name) return -1
            if (A.name > B.name) return 1
            return 0 
        }).map((part) => {
            return part.id
        }).join('_')
    }
    
    async updateCache(change: Change<FirebaseFirestore.DocumentSnapshot>)
    {
        return
    }
}