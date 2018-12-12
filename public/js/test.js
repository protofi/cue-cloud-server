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

    const amount = document.getElementById('add-sensors-amount').value

    axios.put('/api/sensors', {
        amount : amount
    })
    .then((result) => {
        console.log(result.data)
    }).catch((error) => {
        console.log(error.responseText)
    })
})