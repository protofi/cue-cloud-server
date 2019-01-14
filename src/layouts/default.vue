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
							to="/me"
							router
							exact
						>
							<v-list-tile-action>
						
								<v-icon>account_circle</v-icon>
						
							</v-list-tile-action>

							<v-list-tile-content>
						
								<v-list-tile-title>Profile</v-list-tile-title>
						
							</v-list-tile-content>

						</v-list-tile>

						<v-list-tile
							to="/home"
							router
							exact
						>
							<v-list-tile-action>
						
								<v-icon>home</v-icon>
						
							</v-list-tile-action>

							<v-list-tile-content>
						
								<v-list-tile-title>My Home</v-list-tile-title>
						
							</v-list-tile-content>

						</v-list-tile>
						
						<v-list-tile
							v-show="$store.getters['auth/isAdmin']"
							to="/admin"
							router
							exact
						>
							<v-list-tile-action>
						
								<v-icon>security</v-icon>
						
							</v-list-tile-action>

							<v-list-tile-content>
						
								<v-list-tile-title>Admin</v-list-tile-title>
						
							</v-list-tile-content>

						</v-list-tile>

						<v-list-tile
							@click="signOut"
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

						<sign-in-form />

					</v-card-text>
		
					<v-card-actions>

						<v-spacer></v-spacer>
						
						<v-btn
							color="blue darken-1"
							flat @click="signIn.showDialog = false"
						>
							Close
						</v-btn>

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
	  import SignInForm from '~/components/SignInForm.vue'

	export default {
		data() {
			return {
				drawer: null,
				signIn: {
					showDialog : false,
				}
			}
		},
		computed : {
			showDialog () {
				return this.signIn.showDialog && this.$store.getters['auth/isGuest']
			}
		},
		methods : {
			signOut () {
				this.signIn.showDialog = false
				this.$store.dispatch('auth/signOut')
			}
		},
		components : {
			SignInForm
		}
  	}
</script>