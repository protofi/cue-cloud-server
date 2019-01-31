<template>
    
	<div>
		
		<v-toolbar color="cyan" dark tabs>

			<v-toolbar-title>Sensors</v-toolbar-title>

			<v-spacer></v-spacer>

			<v-tabs
				slot="extension"
				v-model="tab"
				color="cyan"
				align-with-title
			>
				<v-tabs-slider color="yellow"></v-tabs-slider>

				<v-tab v-for="item in items" :key="item">
				{{ item }}
				</v-tab>
			
			</v-tabs>

		</v-toolbar>

		<v-tabs-items v-model="tab">

			<v-tab-item v-for="item in items" :key="item">
				
				<v-card flat>
					<v-card-text>{{ text }}</v-card-text>
				</v-card>
				
			</v-tab-item>

		</v-tabs-items>

	</div>

</template>

<script>
export default {
    data () {
      return {
        tab: null,
        items: [
          'all'
        ],
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
      }
    }
}
</script>

<style>

</style>
