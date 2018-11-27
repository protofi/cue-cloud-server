import ModelImpl, { Models } from "./"
import { Many2ManyRelation, N2OneRelation } from "./../Relation"
import { asyncForEach } from "../../util";

export default class User extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.USER, db, snap, id)

        this.actionableFields.set(
            'name', async () => {
                return 
            }
        )
    }

    household(): N2OneRelation
    {
        return this
            .belongsTo(Models.HOUSEHOLD)
            .defineCachableFields([
                'name'
            ]).defineActionableFields({
                'accepted' : async (value: string) => {
                    const household: ModelImpl = await this.household().get()
                    const sensors: any = await household.getField(Models.SENSOR)

                    await asyncForEach(Object.keys(sensors), async (sensorId) => {
                        await this.sensors().attachById(sensorId)
                    })

                    return true
                }
            })
    }

    sensors(): Many2ManyRelation
    {
        return this
            .belongsToMany(Models.SENSOR)
            .defineCachableFields([
                'id'
            ])
    }
}