interface I2MRelation {
    id: string // id of the related collection
    pivot?: Map<string, any> // data associated with the specific relation

    /**
     * Data cached from the related collection
     */
}

interface Relation {
    id: string // id of the related collection
    
    /**
     * Data cached from the related collection
     */
}

interface Users {
    id?: string
    name: string
    email: string
    
    households: I2MRelation
    sensors: Map<string, boolean | Relation>
    events: Map<string, boolean | Relation>
}

interface Households {
    users: Map<string, boolean | Relation>
    sensors: Map<string, boolean | Relation>
}

interface Sensors {
    location: string
    name: string
    deactivated: boolean
    batteryLevel: number

    users: Map<string, boolean | Relation>
    households: I2MRelation
    events: Map<string, boolean | Relation>
}

interface Events {
    sensors: I2MRelation
    users: Map<string, boolean | Relation>
}

interface PivotCollection {
    __rel_col1_name__ : Relation
    __rel_col2_name__ : Relation
    pivot?: Map<string, any>
}