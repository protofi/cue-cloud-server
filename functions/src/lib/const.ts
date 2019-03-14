export enum Roles {
    ADMIN = 'admin'
}

export enum Relations {
    PIVOT   = 'pivot'
}

export enum Errors {
    TOO_MANY_ATTEMPTS           = 'Limit of attempts has been exceeded.',
    DATA_MISSING                = 'Some data is missing in order to complete the request.',
    DATA_VALIATION_ERROR        = 'Some data failed type or value validation.',
    NOT_RELATED                 = 'No relation found.',
    UNAUTHORIZED                = 'You do not have sufficient privileges.',
    NO_SENSOR_UUID              = 'Sensor UUID cannot be undefined or null.',
    MODEL_ALREADY_EXISTS        = 'A model with the given ID already exists.',
    MODEL_NOT_FOUND             = 'No model was found.',
    NO_BASE_STATION             = 'No Base Station was found.',
    SENSOR_ALREADY_PAIRED       = 'The sensor UUID is already paired.',
    BASE_STATION_NOT_CLAIMED    = 'Base Station has not been claimed.',
    GENERAL_ERROR               = 'Something went wrong.'
}

export enum Env {
    NOT_A_PROJECT = 'not-a-project'
}

export enum WhereFilterOP {
    LESS_THAN               = '<',
    LESS_THEN_OR_EQUAL      = '<=',
    EQUAL                   = '==',
    GREATER_THAN_OR_EQUAL   = '>=',
    GREATER_THAN            = '>',
    ARRAY_CONTAINS          = 'array-contains'  
} 