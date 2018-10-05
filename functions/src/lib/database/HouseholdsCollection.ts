import CollectionsImpl, { Collection } from './Collections'
import { resolve } from 'dns';

interface resident {
    uid: string;
}

export enum SubCollection {
    RESIDENTS = 'residents',
}

export default class HouseholdsCollection extends CollectionsImpl {
    
    constructor(db: any)
    {
        super(Collection.HOUSEHOLDS, db)
    }
    
    async create(user: resident): Promise<any>
    {
        const household: FirebaseFirestore.DocumentReference = await this.add({})

        await this.db.collection(this.name).doc(household.id)
                .collection(SubCollection.RESIDENTS).doc(user.uid).set(user)

        return household
    }

    getResidents(householdId: string)
    {
        return this.db.collection(this.name).doc(householdId).collection(SubCollection.RESIDENTS).get()
    }

    addResident(householdId: string, user: resident)
    {
        return this.db.collection(this.name).doc(householdId).collection(SubCollection.RESIDENTS).doc(user.uid).set(user)
    }
}