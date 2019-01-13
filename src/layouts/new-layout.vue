<template>
	
	<v-app>

		<v-toolbar v-show="!authInitializing">

			<v-toolbar-side-icon
				@click.stop="drawer = !drawer"
			>
				<v-icon>
					notes
				</v-icon>

			</v-toolbar-side-icon>

			<v-toolbar-title>
				
				Title

			</v-toolbar-title>

			<v-spacer></v-spacer>

			<v-menu offset-y>
		
				<v-btn
					slot="activator"
					color="primary"
					dark
					icon
				>
					<v-avatar
						color="indigo"
						size="36"
					>
						<v-icon>
							account_circle
						</v-icon>
				
					</v-avatar>

				</v-btn>
		
				<v-list>
		
					<v-list-tile
						v-for="(item, index) in items"
						:key="index"
						@click=""
					>
						<v-list-tile-title>{{ item.title }}</v-list-tile-title>

					</v-list-tile>

				</v-list>

			</v-menu>

		</v-toolbar>

		<v-content v-show="!authInitializing">

			<v-container>
	
				<nuxt />
	
			</v-container>

		</v-content>

		<v-navigation-drawer v-show="!authInitializing"
			v-model="drawer"
			absolute
			app
			hide-overlay
		>
			<v-toolbar flat>
          		
				<v-btn
					icon
					@click.stop="drawer = !drawer"
				>
					<v-icon>chevron_left</v-icon>

				</v-btn>

				<v-toolbar-title></v-toolbar-title>

				<v-spacer></v-spacer>
	
			</v-toolbar>
	
			<v-list>
			
				<v-list-tile
					v-for="item in items"
					:key="item.title+'A'"
					@click=""
				>
					<v-list-tile-action>
				
						<v-icon>{{ item.icon }}</v-icon>
				
					</v-list-tile-action>

					<v-list-tile-content>
				
						<v-list-tile-title>{{ item.title }}</v-list-tile-title>
				
					</v-list-tile-content>

				</v-list-tile>

			</v-list>

		</v-navigation-drawer>

		<v-container
			v-show="authInitializing"
		>
			<v-layout align-center justify-center column fill-height>

				<v-avatar
					size="190"
				>
					<img src="~/../static/cue_temp_logo.png">

				</v-avatar>
				
				<v-spacer></v-spacer>

				<v-progress-linear :indeterminate="true"></v-progress-linear>

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
				items: [
					{ title: 'Home', icon: 'dashboard' },
					{ title: 'About', icon: 'question_answer' }
				]
			}
		},
		computed : {
			authInitializing () {
				return this.$store.getters.userIsLoading
			}
		}
  	}
</script>