import CollectionsImpl, { Collection } from './Collections'

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
    
    async create(user: resident)
    {
        const batch = this.db.batch()

        const household = this.getDocRef()
        batch.set(household, {});
        
        await this.getDocRef(household.id).collection(SubCollection.RESIDENTS).doc(user.uid).set(user)
        await batch.commit()
        
        // const household: FirebaseFirestore.DocumentReference = await this.add({})

        // await this.db.collection(this.name).doc(household.id)
        //         .collection(SubCollection.RESIDENTS).doc(user.uid).set(user)

        return household
    }

    getResidents(householdId: string)
    {
        return this.getDocRef(householdId).collection(SubCollection.RESIDENTS).get()
    }

    addResident(householdId: string, user: resident)
    {
        return this.getDocRef(householdId).collection(SubCollection.RESIDENTS).doc(user.uid).set(user)
    }

    async delete(householdId: string): Promise<any>
    {
        const batch = this.db.batch()
        const residents = await this.getResidents(householdId)
        
        residents.docs.map( async (doc) => {
            return batch.delete(doc.ref)
        })

        batch.commit()

        return super.delete(householdId)
    }
}