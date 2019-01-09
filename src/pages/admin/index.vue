<template>

    <v-layout row>
    <v-flex xs12 sm6 offset-sm3>
      <v-card>
        <v-toolbar color="light-blue" dark>

          <v-toolbar-title>Households</v-toolbar-title>

        </v-toolbar>

        <v-list two-line subheader>
          <v-list-tile
            v-for="household in households"
            :key="household.id"
            avatar
          >
            <v-list-tile-avatar>
              <v-icon class="grey lighten-1 white--text">home</v-icon>
            </v-list-tile-avatar>

            <v-list-tile-content>
              <v-list-tile-title>{{ household.id }}</v-list-tile-title>
              <v-list-tile-sub-title></v-list-tile-sub-title>
            </v-list-tile-content>

            <v-list-tile-action>
              <v-btn icon ripple
              @click.stop="toggleHouseholdInfo(household)">
                <v-icon color="grey lighten-1">info</v-icon>
              </v-btn>
            </v-list-tile-action>
          </v-list-tile>

        </v-list>
      </v-card>
    </v-flex>

    <v-navigation-drawer
      stateless
      value="true"
      v-model="drawer"
      absolute
      right
      hide-overlay
      dark
    >
      <v-list>
        <v-list-tile>
          <v-list-tile-action>
            <v-icon>home</v-icon>
          </v-list-tile-action>

          <v-list-tile-title
            v-if="activeHousehold != null"
          >
            {{ activeHousehold.id }}
            </v-list-tile-title>

        </v-list-tile>

        <!-- Base Station Section -->
        <v-list-group
          v-if="activeHousehold != null"
          prepend-icon="router"
         >
          <v-list-tile slot="activator">
            <v-list-tile-title>BASE STATIONS</v-list-tile-title>
          </v-list-tile>

          <v-list-tile
              v-for="baseStation in activeHouseholdBaseStations"
              :key="baseStation.id"
          >
              <v-list-tile-action> </v-list-tile-action>

              <v-list-tile-title>
                {{baseStation.name ? baseStation.name : baseStation.id }}
              </v-list-tile-title>
              
              <v-list-tile-action>

                 <v-btn icon ripple
                  @click.stop="">
                  <v-icon color="grey lighten-1">
                    delete_forever
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
              v-for="(crud, i) in cruds"
              :key="i"
            >
              <v-list-tile-title v-text="crud[0]"></v-list-tile-title>
              <v-list-tile-action>
                <v-icon v-text="crud[1]"></v-icon>
              </v-list-tile-action>
            </v-list-tile>
          </v-list-group>
        </v-list-group> <!-- Base Station Section End -->

        <!-- Users Section -->
        <v-list-group
          v-if="activeHousehold != null"
          prepend-icon="account_circle"
          value="true"
         >
          <v-list-tile slot="activator">
            <v-list-tile-title>USERS</v-list-tile-title>
          </v-list-tile>

          <v-list-tile
              v-for="user in activeHouseholdUsers"
              :key="user.id"
               >

              <v-list-tile-action> </v-list-tile-action>

              <v-list-tile-title>
                {{user.name ? user.name : user.id }}
              </v-list-tile-title>
              
              <v-list-tile-action>

                 <v-btn icon ripple
                  @click.stop="">
                  <v-icon color="grey lighten-1">
                    delete_forever
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
              v-for="(crud, i) in cruds"
              :key="i"
            >
              <v-list-tile-title v-text="crud[0]"></v-list-tile-title>
              <v-list-tile-action>
                <v-icon v-text="crud[1]"></v-icon>
              </v-list-tile-action>
            </v-list-tile>
          </v-list-group>
        </v-list-group> <!-- Users Section End -->
        
        <!-- Sensors Section -->
        <v-list-group
          v-if="activeHousehold != null"
          prepend-icon="settings_remote"
         >
          <v-list-tile slot="activator">
            <v-list-tile-title>SENSORS</v-list-tile-title>
          </v-list-tile>

          <v-list-tile v-if="activeHouseholdSensers.length < 1">

            <v-list-tile-action> </v-list-tile-action>

             <v-list-tile-title>
                No sensors registered
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

                <v-btn icon ripple
                @click.stop="sensorNotification(sensor)">
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
              v-for="(crud, i) in cruds"
              :key="i"
            >
              <v-list-tile-title v-text="crud[0]"></v-list-tile-title>
              <v-list-tile-action>
                <v-icon v-text="crud[1]"></v-icon>
              </v-list-tile-action>
            </v-list-tile>
          </v-list-group>
        </v-list-group> <!-- Sensors Section End -->
      </v-list>
    </v-navigation-drawer>

  </v-layout>

</template>

<script>
    import { firestore } from '~/plugins/firebase.js'

  export default {
    data () {
      return {
          drawer: null,
          households: [],
          activeHousehold : null,
          admins: [
            ['Management', 'people_outline'],
            ['Settings', 'settings']
          ],
          cruds: [
            ['Create', 'add'],
            ['Delete all', 'delete']
          ]
      }
    },
    methods : {
      toggleHouseholdInfo(household) {

        this.drawer = !(this.activeHousehold && this.activeHousehold.id == household.id && this.drawer)
        this.activeHousehold = household
      },
      sensorNotification(sensor) {
        this.$axios.$put(`sensors/${sensor.id}/notifications`)
      }
    },
    computed: {
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
      }
    },

    created () {
        firestore.collection('households')
            .onSnapshot(snapshot => {
                const households = []
                
                snapshot.docs.forEach(doc => {
                    
                    const household = {
                        id    : doc.id,
                        data : doc.data()
                    }

                    households.push(household)

                    if(this.activeHousehold && this.activeHousehold.id == doc.id)
                        this.activeHousehold = household
                })

                this.households = households
            }
        )
    }
  }
</script>

<style>

</style>
