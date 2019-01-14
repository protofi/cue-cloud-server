<template>
	
	<v-app>

		<div v-show="!$store.getters['auth/loading']">

			<v-toolbar>

				<v-toolbar-side-icon
					@click.stop="drawer = !drawer"
				>
					<v-icon>
						notes
					</v-icon>

				</v-toolbar-side-icon>

				<v-toolbar-title>
					
					Cue

				</v-toolbar-title>

				<v-spacer></v-spacer>

				<v-menu
					offset-y
					v-show="!$store.getters['auth/isGuest']"
				>
			
					<v-btn
						slot="activator"
						color="grey  lighten-1"
						dark
						icon
					>
						<v-avatar
							size="36"
						>
							<v-icon>
								account_circle
							</v-icon>
					
						</v-avatar>

					</v-btn>
			
					<v-list>
			
						<v-list-tile
							@click=""
						>
							<v-list-tile-action>
						
								<v-icon>account_circle</v-icon>
						
							</v-list-tile-action>

							<v-list-tile-content>
						
								<v-list-tile-title>Profile</v-list-tile-title>
						
							</v-list-tile-content>

						</v-list-tile>

						<v-list-tile
							@click=""
						>
							<v-list-tile-action>
						
								<v-icon>home</v-icon>
						
							</v-list-tile-action>

							<v-list-tile-content>
						
								<v-list-tile-title>My Home</v-list-tile-title>
						
							</v-list-tile-content>

						</v-list-tile>
						
						<v-list-tile
							@click=""
							v-show="$store.getters['auth/isAdmin']"
						>
							<v-list-tile-action>
						
								<v-icon>security</v-icon>
						
							</v-list-tile-action>

							<v-list-tile-content>
						
								<v-list-tile-title>Admin</v-list-tile-title>
						
							</v-list-tile-content>

						</v-list-tile>

						<v-list-tile
							@click="$store.dispatch('auth/signOut')"
						>
							<v-list-tile-action>
						
								<v-icon>lock</v-icon>
						
							</v-list-tile-action>

							<v-list-tile-content>
						
								<v-list-tile-title>Sign out</v-list-tile-title>
						
							</v-list-tile-content>

						</v-list-tile>

					</v-list>

				</v-menu>

				<v-btn
					flat
					v-show="$store.getters['auth/isGuest']"
					@click="signIn.showDialog = true"
				>
					Sign in
				</v-btn>

			</v-toolbar>

			<v-content>

				<nuxt />

			</v-content>

			<v-navigation-drawer
				app
				dark
				clipped
				hide-overlay
				v-model="drawer"
				disable-route-watcher
			>
				<v-toolbar flat>
					
					<v-btn
						icon
						@click.stop="drawer = !drawer"
					>
						<v-icon>chevron_left</v-icon>

					</v-btn>

					<v-toolbar-title>Cue</v-toolbar-title>

					<v-spacer></v-spacer>
		
				</v-toolbar>
		
				<v-list>
				
					<v-list-tile
						@click=""
					>
						<v-list-tile-action>
					
							<v-icon>home</v-icon>
					
						</v-list-tile-action>

						<v-list-tile-content>
					
							<v-list-tile-title>Households</v-list-tile-title>
					
						</v-list-tile-content>

					</v-list-tile>

				</v-list>

			</v-navigation-drawer>
				
			<v-dialog v-model="showDialog" max-width="600px">

				<v-card>

					<v-card-title>

						<span class="headline">Sign in</span>

					</v-card-title>

					<v-card-text>

						<v-form ref="signInForm">
							
							<v-container grid-list-md>
								<v-layout wrap>
									<v-flex xs12>
										<v-text-field
											:rules="signIn.emailRules"
											label="Email"
											:validate-on-blur='true'
											required
											v-model="signIn.email">
										</v-text-field>
									</v-flex>
									
									<v-flex xs12>
										<v-text-field
											:validate-on-blur='true'
											:rules="signIn.passwordRules"
											:type="'password'"
											label="Password"
											required
											v-model="signIn.password">
										</v-text-field>
									</v-flex>
								
								</v-layout>

									<v-btn
										type="submit"
										:loading="$store.getters['auth/processing']"
										@click="submit"
									>
										Sign in
									</v-btn>

									<v-btn @click="clear">Reset</v-btn>

							</v-container>
							
							<v-alert
								:value="signIn.formError"
								color="error"
								icon="warning"
								transition="scale-transition"
								outline
							>
								{{ $store.getters['auth/error'] }}
							</v-alert>

						</v-form>

					</v-card-text>
		
					<v-card-actions>

						<v-spacer></v-spacer>
						<v-btn color="blue darken-1" flat @click="signIn.showDialog = false">Close</v-btn>

					</v-card-actions>

				</v-card>
		
			</v-dialog>

		</div>

		<v-container
			v-show="$store.getters['auth/loading']"
		>
			<v-layout align-center justify-center column fill-height>

				<v-avatar
					size="144"
				>
					<img src="~/../static/cue_temp_logo.png">

				</v-avatar>
				
			</v-layout>

		</v-container>

	</v-app>

</template>

<script>
  	import { auth } from '~/plugins/firebase.js'

	export default {
		data() {
			return {
				drawer: null,
				signIn: {
					showDialog : false,
					formError : false,

					valid: true,
					password : '',
					passwordRules: [
						v => !!v || 'Du skal indtaste en adgangskode',
						v => (v && v.length >= 8) || 'Din adgangskode skal være 8 tegn eller flere',
					],
					email : '',
					emailRules: [
						v => !!v || 'Du skal indtaste en email',
						v => /.+@.+/.test(v) || 'Indtast venligst en korrekt email'
					],
				}
			}
		},
		watch: {
            formErrorMessage (v) {
                this.signIn.formError = (v.length > 0)
            },
        },
		computed : {
			formErrorMessage() {
                return this.$store.getters['auth/error']
			},
			showDialog () {
				return this.signIn.showDialog && this.$store.getters['auth/isGuest']
			}
		},
		methods : {
			submit (e) {
                e.preventDefault()

                if (this.$refs.signInForm.validate()) {

                    this.$store.dispatch('auth/signIn', {
                        email : this.signIn.email,
                        password : this.signIn.password
                    })
                }
            },
            clear () {
                this.$refs.signInForm.reset()
            }
		}
  	}
</script>