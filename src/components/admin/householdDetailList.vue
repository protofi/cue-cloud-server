<template>

    <v-list>
                            
        <div v-if="activeHousehold != null">

            <v-list-tile>

                <v-list-tile-action>

                    <v-icon>home</v-icon>

                </v-list-tile-action>

                <v-list-tile-title>
                    {{ activeHousehold.id }}
                </v-list-tile-title>

            </v-list-tile>

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
                    
                    <!-- <v-list-tile-action>

                        <v-btn icon ripple
                        @click.stop="">
                        <v-icon color="grey lighten-1">
                            clear
                        </v-icon>
                        </v-btn>

                    </v-list-tile-action> -->
                    
                </v-list-tile>

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

</template>

<script>
export default {
    data () {
        return {
            
        }
    }
}
</script>

<style>

</style>

