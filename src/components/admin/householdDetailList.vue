<template>

	<div>
		
		<v-list>
								
			<div v-if="activeHousehold != null">

				<v-list-tile
					:to="activeHousehold.path"
					ripple
					router

				>

					<v-list-tile-action>

						<v-icon>home</v-icon>

					</v-list-tile-action>

					<v-list-tile-title>
						{{ activeHousehold.id }}
					</v-list-tile-title>

				</v-list-tile>

				<v-divider></v-divider>

				<!-- Base Station Section -->
				<v-list-group
					prepend-icon="router"
				>
					<v-list-tile slot="activator">

						<v-list-tile-title>BASE STATIONS</v-list-tile-title>

					</v-list-tile>

					<v-list-tile v-if="activeHouseholdBaseStations.length < 1">

						<v-list-tile-action></v-list-tile-action>

						<v-list-tile-title>
							No Base Stations are claimed
						</v-list-tile-title>

					</v-list-tile>

					<v-list-tile
						v-for="baseStation in activeHouseholdBaseStations"
						:key="baseStation.id"
					>
						<v-list-tile-action></v-list-tile-action>

						<v-list-tile-title>
							{{baseStation.name ? baseStation.name : baseStation.id }}
						</v-list-tile-title>
						
						<!-- <v-list-tile-action>

							<v-btn icon ripple
							@click.stop="unlinkBaseStation(baseStation.id)">
							<v-icon color="grey lighten-1">
								link_off
							</v-icon>
							</v-btn>

						</v-list-tile-action> -->
						
						</v-list-tile>

					<v-list-group
						sub-group
						no-action
					>
						<v-list-tile slot="activator">
						<v-list-tile-title>Actions</v-list-tile-title>
						</v-list-tile>

						<v-list-tile
						@click="showBaseStationDialog = true"
						ripple
						>
							<v-list-tile-title>Claim new</v-list-tile-title>
							
							<v-list-tile-action>
								<v-icon>fiber_pin</v-icon>
							</v-list-tile-action>
						
						</v-list-tile>

					</v-list-group>

				</v-list-group> <!-- Base Station Section End -->

				<!-- Users Section -->
				<v-list-group
					prepend-icon="account_circle"
				>

					<v-list-tile slot="activator">
					
						<v-list-tile-title>USERS</v-list-tile-title>
					
					</v-list-tile>

					<v-list-tile
						v-for="user in activeHouseholdUsers"
						:key="user.id"
					>

						<v-list-tile-action></v-list-tile-action>

						<v-list-tile-title>
							{{user.name ? user.name : user.id }}
						</v-list-tile-title>
						
						<v-list-tile-action>

							<v-btn icon ripple
							@click.stop="kickUser(user)">
							<v-icon color="grey lighten-1">
								clear
							</v-icon>
							</v-btn>

						</v-list-tile-action>
						
					</v-list-tile>

					<v-list-group
						sub-group
						no-action
					>
						<v-list-tile slot="activator">
						<v-list-tile-title>Actions</v-list-tile-title>
						</v-list-tile>

						<v-list-tile
						@click="showInviteUserDialog"
						ripple
						>
							<v-list-tile-title>Invite</v-list-tile-title>
							
							<v-list-tile-action>
								<v-icon>mail</v-icon>
							</v-list-tile-action>
						
						</v-list-tile>

					</v-list-group>

				</v-list-group> <!-- Users Section End -->
		
				<!-- Sensors Section -->
				<v-list-group
					prepend-icon="settings_remote"
				>

					<v-list-tile slot="activator">
						<v-list-tile-title>SENSORS</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-if="activeHouseholdSensers.length < 1">

						<v-list-tile-action></v-list-tile-action>

						<v-list-tile-title>
							No sensors are paired
						</v-list-tile-title>

					</v-list-tile>

					<v-list-tile
						v-for="sensor in activeHouseholdSensers"
						:key="sensor.id"
					>
						<v-list-tile-action></v-list-tile-action>

						<v-list-tile-title>
							{{sensor.name ? sensor.name : sensor.id }}
						</v-list-tile-title>
						
						<v-list-tile-action>

							<v-btn
								icon
								ripple
								@click.stop="sensorNotification(sensor)"
								:loading="sensorNotificationLoading"
							>
								<v-icon color="grey lighten-1">
									notification_important
								</v-icon>

							</v-btn>

						</v-list-tile-action>
						
					</v-list-tile>

					<v-list-group
						sub-group
						no-action
					>
						<v-list-tile slot="activator">

							<v-list-tile-title>Actions</v-list-tile-title>

						</v-list-tile>

						<v-list-tile
							@click="pairSensor(activeHousehold.id)"
							:disabled="sensorConfigLoading"
							ripple
						>
							<v-list-tile-title>Pair new</v-list-tile-title>

							<v-list-tile-action>
								
								<v-progress-circular
									v-if="sensorConfigLoading"
									:size="24"
									:width="3"
									color="white"
									indeterminate
								></v-progress-circular>

								<v-icon
									v-if="!sensorConfigLoading"
									>
								leak_add</v-icon>

							</v-list-tile-action>

						</v-list-tile>

						<v-list-tile
							@click="deleteSensors(activeHousehold.id)"
							:disabled="deleteSensorsLoading"
							ripple
						>
							<v-list-tile-title>Delete all</v-list-tile-title>
							
							<v-list-tile-action>

								<v-progress-circular
								v-if="deleteSensorsLoading"
								:size="24"
								:width="3"
								color="white"
								indeterminate
								></v-progress-circular>

								<v-icon
								v-if="!deleteSensorsLoading"
								>delete_forever</v-icon>

							</v-list-tile-action>

						</v-list-tile>

					</v-list-group>

				</v-list-group> <!-- Sensors Section End -->

			</div>

			<v-list-tile v-else>

				<v-list-tile-title>
				
					Click the <v-icon>info</v-icon> icon to see details about a specific household
				
				</v-list-tile-title>

			</v-list-tile>

		</v-list>

		<v-dialog v-model="userInviteDialog.show" max-width="600px">
            
            <v-form
                ref="inviteUserForm"
                >

                <v-card>
        
                    <v-card-title
                        class="headline white--text pink"
                        >
                            Invite User to Household
                    </v-card-title>

                    <v-card-text>

                        <v-container grid-list-md>

                            <v-layout wrap>

                                Pick an existing User to invite.

                            </v-layout>

                            <v-layout wrap>

                                <v-flex xs12 sm6>
                                    <v-select
                                    :items="users"
                                    no-data-text="No users found"
                                    label="Invitee"
                                    v-model="userInviteDialog.inviteeEmail"
                                    required
                                    :rules="userInviteDialog.inviteeRules"
                                    ></v-select>

									<v-checkbox
										v-model="userInviteDialog.accept"
										label="Accept invitaion immediately"
									></v-checkbox>
                                </v-flex>

                            </v-layout>

                        </v-container>

                        <p> 
                            Only users not already assigned a Household can be invited.
                        </p>

                    </v-card-text>
        
                    <v-card-actions>
        
                        <v-spacer></v-spacer>
            
                        <v-btn color="blue darken-1" flat @click="userInviteDialog.show = false">Cancel</v-btn>
                        <v-btn
                            color="blue darken-1"
                            flat
                            type="submit"
							@click="inviteUser"
                            :loading="userInviteDialog.loading"
                            >
                            Send invite
                        </v-btn>
        
                    </v-card-actions>
        
                </v-card>
            
            </v-form>

        </v-dialog>

		<v-dialog v-model="showBaseStationDialog" max-width="600px">
				
			<v-card>

				<v-card-title>
					<span class="headline">Enter Base Station Pin Code</span>
				</v-card-title>

				<v-card-text>
					
					<v-form v-model="baseStationDialogValid" ref="baseStationClaimForm">
						
						<v-container grid-list-md>
						
							<v-layout wrap>

								<v-flex xs12>

									<v-text-field
										:rules="baseStationPinRules"
										label="Pin code"
										v-model="baseStationPin"
										required>
									</v-text-field>

								</v-flex>

							</v-layout>

						</v-container>

						<v-alert
							:value="baseStationPinError"
							color="error"
							icon="warning"
							transition="scale-transition"
							outline
						>
							{{ baseStationPinErrorMessage }}
						</v-alert>

					</v-form>

				</v-card-text>

				<v-card-actions>

					<v-spacer></v-spacer>
					<v-btn color="blue darken-1" flat @click="showBaseStationDialog = false">Close</v-btn>
					<v-btn color="blue darken-1" flat type="submit" :disabled="claimBaseStationLoading" :loading="claimBaseStationLoading" @click="claimBaseStation">Claim</v-btn>
				
				</v-card-actions>

			</v-card>

		</v-dialog>

		<v-dialog v-model="showSensorConfigDialog" max-width="600px">

			<v-card>

				<v-card-title>

					<span class="headline">Configurate the newly paired sensor</span>
				
				</v-card-title>

				<v-card-text>

					<v-form ref="sensorForm">

						<v-container grid-list-md>

							<v-layout wrap>

								<v-flex xs12>
									<v-text-field
										label="Sensor id"
										disabled
										v-model="sensorIdToBeConfigured">
									</v-text-field>
								</v-flex>

								<v-flex xs12>
									<v-text-field
										label="Name"
										v-model="sensorName">
									</v-text-field>
								</v-flex>

								<v-flex xs12>
									<v-text-field
										label="Sensor icon"
										v-model="sensorIcon">
									</v-text-field>
								</v-flex>

								<v-flex xs12>
									<v-text-field
										label="Location of the sensor"
										v-model="sensorLocation">
									</v-text-field>
								</v-flex>

							</v-layout>

						</v-container>

						<v-alert
							:value="sensorConfigError"
							color="error"
							icon="warning"
							transition="scale-transition"
							outline
						>
							{{ sensorConfigErrorMessage }}

						</v-alert>

					</v-form>

				</v-card-text>

				<v-card-actions>

					<v-spacer></v-spacer>

					<v-btn color="blue darken-1" flat @click="showSensorConfigDialog = false">Leave unconfigured</v-btn>
					<v-btn color="blue darken-1" flat type="submit" @click="saveSensorData">Save</v-btn>
				
				</v-card-actions>

			</v-card>
			
		</v-dialog>

		<v-card>

			<v-snackbar
				v-model="snackbar"
				:color="color"
				multi-line
				:timeout="0"
			>
				{{ text }}
				<v-btn
					loading
					dark
					flat
				>
					Re-authenticate
				</v-btn>

				<v-btn
					dark
					flat
					@click="snackbar = false"
				>
					Close
				</v-btn>

			</v-snackbar>

		</v-card>

	</div>

</template>

<script>

import { firebase, firestore, messaging } from '~/plugins/firebase.js'

export default {
	props : [
		'activeHousehold'
	],
	data () {
		return {
			snackbar: false,
			color: 'error',
			mode: '',
			timeout: 6000,
			text: 'It looks like your authentication session has expired.',

			sensorConfigLoading : false,
			showSensorConfigDialog: false,
			sensorIdToBeConfigured : '',
			sensorName : '',
			sensorLocation : '',
			sensorIcon : '',
			sensorConfigError : false,
			sensorConfigErrorMessage : '',

			deleteSensorsLoading : false,

			claimBaseStationLoading : false,
			showBaseStationDialog: false,
			baseStationDialogValid: false,
			baseStationPin : '',
			baseStationPinRules: [
				v => !!v || 'A pincode is required'
			],
			baseStationPinErrorMessage : '',
			baseStationPinError : false,

			sensorNotificationLoading : false,

			userInviteDialog : {
				show : false,
                loading : false,
				inviteeEmail : null,
				accept : false,
                inviteeRules: [
                    v => !!v || 'You need to choose an invitee',
                ],
                userDocs : []
			}
		}
	},
	
	watch : {
		baseStationPinErrorMessage (v) {
			this.baseStationPinError = (v.length > 0)
		},
		sensorConfigErrorMessage (v) {
			this.sensorConfigError = (v.length > 0)
		},
	},

	computed : {
		activeHouseholdUsers () {
			const users = []

			if(!this.activeHousehold || !this.activeHousehold.data.users) return users

			Object.keys(this.activeHousehold.data.users).forEach(id => {
				users.push({
					id : id,
					name: this.activeHousehold.data.users[id].name
				})
			})

			return users
		},

		activeHouseholdBaseStations () {
			const baseStations = []

			if(!this.activeHousehold || !this.activeHousehold.data.base_stations) return baseStations

			Object.keys(this.activeHousehold.data.base_stations).forEach(id => {
				baseStations.push({
					id : id
				})
			})

			return baseStations
		},

		activeHouseholdSensers () {
			const sensors = []

			if(!this.activeHousehold || !this.activeHousehold.data.sensors) return sensors

			Object.keys(this.activeHousehold.data.sensors).forEach(id => {
				sensors.push({
					id : id,
					name : this.activeHousehold.data.sensors[id].name
				})
			})

			return sensors
		},
		users () {
            return this.userInviteDialog.userDocs.filter(user => {
                return !((user.data()).households)
            }).map(user => {
                const data = user.data()
                return {
                    text : (data.name) ? data.name : data.email,
                    value : user.email
                }
            })
        }
	},
		
	methods : {
		
		async claimBaseStation (event)
		{
			event.preventDefault()
			
			this.baseStationPinErrorMessage = ''
			this.claimBaseStationLoading = true

			if (this.$refs.baseStationClaimForm.validate())
			{
				const batch = firestore.batch()

				try{
					const querySnapshot = await firestore.collection('base_stations').where('pin', '==', this.baseStationPin).get()

					if(querySnapshot.empty)	 this.baseStationPinErrorMessage = 'Pin code is invalid. Check if you have typed the code correctly.'
					if(querySnapshot.size > 1)  this.baseStationPinErrorMessage = 'Something went wrong. please contact Cue support.'
					if(querySnapshot.size != 1)
					{
						this.claimBaseStationLoading = false
						return
					}

					const baseStation = querySnapshot.docs[0]

					if(baseStation.data().households)
					{
						this.baseStationPinErrorMessage = 'This Base Station has already been claimed.'
						this.claimBaseStationLoading = false
						return
					}

					batch.set(firestore.collection('households').doc(this.activeHousehold.id), {
						'base_stations' : {
							[baseStation.id] : true
						}
					}, {
						merge : true
					})

					batch.set(firestore.collection('base_stations').doc(baseStation.id), {
						'households' : {
							id : this.activeHousehold.id
						}
					}, {
						merge : true
					})

					try{
						await batch.commit()
					}
					catch(e) {
						console.log(e)
					}

					this.showBaseStationDialog = false
					this.baseStationPin = ''
				}
				catch(e)
				{
					this.baseStationPinErrorMessage = 'Something went wrong. Contact the closest developer.'

					console.log("Error getting documents: ", e);
				}
			}
			else
			{
				this.claimBaseStationLoading = false
			}
		},


		async showInviteUserDialog()
		{
			this.userInviteDialog.show = true

			try{
                this.userInviteDialog.userDocs = (await firestore.collection('users').get()).docs
            }
            catch(e)
            {
                console.log('LISTEN ON USER', e)
            }
		},

		async inviteUser(event)
		{
			event.preventDefault()

			if (!this.$refs.inviteUserForm.validate()) return

			this.userInviteDialog.loading = true

			try{

				const { data } = await this.$axios.post(`/households/${this.activeHousehold.id}/invitations`, {
					email : this.userInviteDialog.inviteeEmail
				})

				if(data.success)
				{
					if(this.userInviteDialog.accept)
					{
						await firestore.collection('users').doc(data.inviteeId).set({
							households : {
								pivot : {
									accepted : true
								}
							}
						}, { merge : true })
					}
				}

                this.userInviteDialog.loading = false
                this.userInviteDialog.inviteeEmail = null
                this.userInviteDialog.accept = false
				this.$refs.inviteUserForm.reset()
				this.userInviteDialog.show = false
			}
			catch(e)
			{
				console.log(e)
			}
		},

		async kickUser(user)
		{
			const userId = user.id
			
			// await firestore.collection('users').doc(userId).set({

			// })
		},

		async pairSensor(householdId)
		{
			this.sensorConfigLoading = true

			try{
				const response = await this.$axios.$put(`households/${householdId}/sensors`)

				this.showSensorConfigDialog = true
				this.sensorIdToBeConfigured = response.sensor
			}
			catch(e)
			{
				console.log(e)
			}

			this.sensorConfigLoading = false
		},

		async saveSensorData (event)
		{
			event.preventDefault()
		
			try{
				await firestore.collection('sensors').doc(this.sensorIdToBeConfigured).set({
					name : this.sensorName,
					location : this.sensorLocation,
					icon_string : this.sensorIcon
				}, {
					merge : true
				})

				this.sensorName = ''
				this.sensorLocation = ''
				this.sensorIcon = ''
			
				this.showSensorConfigDialog = false
			}
			catch(e)
			{
				console.log(e)
			}
		},

		async deleteSensors(householdId)
		{
			this.deleteSensorsLoading = true
		
			this.$axios.$delete(`households/${householdId}/sensors`)
				.catch(e => {
					console.log(e)
				})
				.finally(() => {
					this.deleteSensorsLoading = false
				})
		},
	
		sensorNotification(sensor)
		{
			this.sensorNotificationLoading = true

			this.$axios.$put(`sensors/${sensor.id}/notifications`)
			.finally(() =>
			{
				this.sensorNotificationLoading = false
			}).catch(e => {
					
			})
		},

	},
}
</script>

<style>

</style>

