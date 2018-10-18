interface relation {
    id: string
    /*...*/
}

interface users {
    households: Map</*id*/string, boolean | object>
    sensors: Map</*id*/string, boolean | object>
    events: Map</*id*/string, boolean | object>
}

interface households {
    users: Map</*id*/string, boolean | object>
    sensors: relation
}

interface sensors {
    users: Map</*id*/string, boolean | object>
}