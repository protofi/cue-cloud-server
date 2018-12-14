const auth = firebase.auth()
const db = firebase.firestore();

const settings = {timestampsInSnapshots: true};
db.settings(settings);

document.getElementById('delete-sensors').addEventListener('submit', (event) => {
    event.preventDefault()

    axios.delete('/api/sensors')
    .then((result) => {
        console.log(result.data)
    }).catch((error) => {
        console.log(error)
    })
})

document.getElementById('add-sensors').addEventListener('submit', (event) => {
    event.preventDefault()

    axios.put('/api/sensors')
    .then((result) => {

        Object.keys(result.data.sensors).forEach((householdId) => {
            
            console.log(`SENSORS ADDED TO HOUSEHOLD ${householdId}:`)
            
            Object.keys(result.data.sensors[householdId]).forEach((sensorId) => {

                result.data.sensors[householdId][sensorId].ID = sensorId
                console.table(result.data.sensors[householdId][sensorId])
            })
        })

    }).catch((error) => {
        console.log(error)
        console.log(error.responseText)
    })
})