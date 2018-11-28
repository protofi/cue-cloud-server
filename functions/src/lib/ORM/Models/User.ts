import ModelImpl, { Models } from "./"
import { Many2ManyRelation, N2OneRelation } from "./../Relation"
import { asyncForEach } from "../../util";

export default class User extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.USER, db, snap, id)
    }

    household(): N2OneRelation
    {
        return this
            .belongsTo(Models.HOUSEHOLD)
            .defineCachableFields([
                'name'
            ]).defineActionableField(
                'accepted', async (owner: User, accecpted: string) => {

                    if(!accecpted) return

                    const household = await owner.household().get()
                    if(!household) return

                    const sensors: any = await household.getField(Models.SENSOR)
                    if(!sensors) return

                    await asyncForEach(Object.keys(sensors), async (sensorId) => {
                        await this.sensors().attachById(sensorId)
                    })

                    return
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