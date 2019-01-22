export enum Roles {
    ADMIN = 'admin'
}

export enum Relations {
    PIVOT   = 'pivot'
}

export enum Errors {
    UNAUTHORIZED    = 'You do not have sufficient privileges.',
    MODEL_NOT_FOUND = 'No model was found.',
    NOT_RELATED     = 'No relation found.',
    NO_BASE_STATION = 'No Base Station was found.',
    BASE_STATION_NOT_CLAIMED = 'Base Station has not been claimed.',
    NO_SENSOR_UUID  = 'Sensor UUID cannot be undefined or null.',
    SENSOR_ALREADY_PAIRED = 'The sensor UUID is already paired.'
}