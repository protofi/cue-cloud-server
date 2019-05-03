<template>

	<div>

		<v-toolbar color="cue-green-4" dark tabs>

			<v-toolbar-title>Senosrs</v-toolbar-title>

            <v-spacer></v-spacer>

		</v-toolbar>
	
		<v-container
			fluid
			grid-list-xl
		>
			<v-layout row wrap>

				<v-flex xs12
					v-for="(sensors, householdId) in sensorsByHousehold"
					:key="householdId"
				>

					<v-btn
						flat
						@click.stop="">
						<v-icon left>home</v-icon>
						{{ householdId }}
					</v-btn>

					<v-card color="transparent" flat>
						
						<v-container
							fluid
							grid-list-lg
						>

							<v-layout row wrap>

								<sensor-details-card-item
									v-for="sensor in sensors"
									:key="sensor.id"
									:sensor="sensor"
								>

								</sensor-details-card-item>

							</v-layout>

						</v-container>
						
					</v-card>

				</v-flex>

			</v-layout>

		</v-container>

	</div>

</template>

<script>

import { firestore } from '~/plugins/firebase.js'
import _ from 'lodash'
import SensorDetailsCardItem from '~/components/admin/SensorDetailsCardItem.vue'

export default {
	data () {
		return {
			sensors : {},
		}
	},
	components : {
        SensorDetailsCardItem,
    },
	created ()
	{
		firestore.collection('sensors')
			.onSnapshot(({ docs }) => {

			const sensors = {}

			docs.forEach(doc => {

				const oldBaseStation = this.sensors[doc.id]
				const meta = (oldBaseStation) ? oldBaseStation.meta : {}

				const data = doc.data()

				const baseStation = {
					id      : doc.id,
					path    : `/admin/sensors/${doc.id}`,
					data    : data,
					meta    : meta
				}

				sensors[doc.id] = baseStation
			})

			this.sensors = sensors
		})
	},

	computed : {

		sensorsByHousehold ()
		{
			const sorted = {}

			_.forOwn(this.sensors, sensor => {
				
				if(!sorted[sensor.data.households.id])
					sorted[sensor.data.households.id] = []

				sorted[sensor.data.households.id].push(sensor)
			})

			return sorted
		}
	},

	methods : {
		
	}
}
</script>

<style>

</style>
