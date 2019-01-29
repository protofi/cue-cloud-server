export enum Roles {
    ADMIN = 'admin'
}

export enum Relations {
    PIVOT   = 'pivot'
}

export enum Errors {
    NOT_RELATED                 = 'No relation found.',
    UNAUTHORIZED                = 'You do not have sufficient privileges.',
    NO_SENSOR_UUID              = 'Sensor UUID cannot be undefined or null.',
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