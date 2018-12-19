const auth = firebase.auth()
const db = firebase.firestore();
const settings = {timestampsInSnapshots: true};
db.settings(settings);

axios.get('/api/base-station').then((response) => {

    const baseStationList = document.querySelector('div.base-station-list ul')

    const baseStations = response.data.baseStations

    Object.keys(baseStations).forEach((UUID) => {

        const baseStationDOM = document.createElement('li')
        baseStationDOM.innerHTML = UUID
        baseStationList.appendChild(baseStationDOM)
    })
})