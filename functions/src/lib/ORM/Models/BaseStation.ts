import ModelImpl, { Models } from "./";
import { Many2OneRelation } from "../Relation";
import { Errors } from "../../const";
const randomstring = require('randomstring')

export default class BaseStation extends ModelImpl {

    static readonly f = {
        ID          : 'id',
        PIN         : 'pin',
        WEBSOCKET   : {
            _       : 'websocket',
            HOST    : 'hostname',
            PORT    : 'port',
            ADDRESS : 'address'
        }
    }

    constructor(db: any, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.BASE_STATION, db, snap, id)
    }

    household(): Many2OneRelation
    {
        return this.haveOne(Models.HOUSEHOLD)
    }

    /**
     * Helper Methods
     */

    private pinCodeGeneratorCircuitBreakerLimit = 10

    async generateUniquePin(attempts: number = 0): Promise<string>
    {
        const code = randomstring.generate({
            readable : true,
            length : 5,
            capitalization : 'uppercase'
        })
        
        const existingBaseStation = await this.db.collection(this.name).where(BaseStation.f.PIN, '==', code).get()

        if(existingBaseStation.empty) return code

        const attempt = attempts+1

        if(attempt > this.pinCodeGeneratorCircuitBreakerLimit) throw new Error(Errors.TOO_MANY_ATTEMPTS)

        return this.generateUniquePin(attempt)
    }
}