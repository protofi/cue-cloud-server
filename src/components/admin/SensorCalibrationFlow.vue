<template>

    <v-stepper v-model="step">

        <v-stepper-header>

            <v-stepper-step :complete="step > 1" step="1">Select sensor</v-stepper-step>

            <v-divider></v-divider>

            <v-stepper-step :complete="step > 2" step="2">Connect Sensor</v-stepper-step>

            <v-divider></v-divider>

            <v-stepper-step :complete="step > 3" step="3">Calibrate Sensor</v-stepper-step>

            <v-divider></v-divider>

            <v-stepper-step :complete="step > 4" step="4">Finish</v-stepper-step>

        </v-stepper-header>

        <v-stepper-items>

            <v-stepper-content step="1">

                <v-card
                    class="mb-5"
                    height="200px"
                    elevation="0"
                >
                    <v-list two-line subheader>

                        <template 
                            v-for="sensor in sensors"
                        >
                           
                            <v-list-tile
                                :key="sensor.id"
                                avatar
                            >

                                <v-list-tile-avatar>
                                    
                                    <v-icon>settings_remote</v-icon>

                                </v-list-tile-avatar>

                                <v-list-tile-content>

                                    <v-list-tile-title>

                                        {{ sensor.data.name }}

                                        <span v-if="sensor.data.location">
                                            i {{ sensor.data.location.toLowerCase() }}
                                        </span>

                                    </v-list-tile-title>

                                    <v-list-tile-sub-title>{{ sensor.id }}</v-list-tile-sub-title>

                                </v-list-tile-content>

                                <v-list-tile-action>

                                    <v-btn
                                        flat
                                        dark color="cue-green-5"
                                        @click.stop="initializeCalibration(sensor.id)"
                                    >
                                        Calibrate
                                    </v-btn>

                                </v-list-tile-action>

                            </v-list-tile>

                        </template>

                    </v-list>

                </v-card>

                <v-btn
                    color="cue-green-5"
                    @click.stop="$emit('dismissed')"
                    dark
                    flat
                >
                    Cancel
                </v-btn>

            </v-stepper-content>

            <v-stepper-content step="2">
                <v-card
                    class="mb-5"
                    height="200px"
                    elevation="0"
                >

                    Pressing the button on the sensors.
                
                </v-card>

                <v-btn
                    color="cue-green-5"
                    @click.stop="$emit('dismissed')"
                    dark
                    flat
                >
                    Cancel
                </v-btn>

            </v-stepper-content>

            <v-stepper-content step="3">
                <v-card
                    class="mb-5"
                    height="200px"
                    elevation="0"
                >
                    <v-list two-line subheader>

                        <template v-for="n in probeCount">
                           
                            <v-list-tile
                                :key="n"
                                avatar
                            >

                                <v-list-tile-avatar>
                                    
                                    <v-avatar
                                        v-if="probeIndex>n"
                                        size="40"
                                        color="cue-green-5">

                                        <v-icon dark>check</v-icon>

                                    </v-avatar>

                                    <v-icon large v-else>notifications</v-icon>

                                </v-list-tile-avatar>

                                <v-list-tile-content v-if="probeIndex==n">
                                    
                                    When you are ready, press GO and ring the doorbell within the next 10 seconds

                                </v-list-tile-content>

                                <v-list-tile-action v-if="probeIndex==n">

                                    <v-btn
                                        :loading="loading"
                                        dark color="cue-green-5"
                                        @click.stop="calibrationProbe()"
                                    >
                                        Go
                                    </v-btn>

                                </v-list-tile-action>

                            </v-list-tile>

                        </template>

                    </v-list>
                
                </v-card>

                <v-btn
                    color="cue-green-5"
                    @click.stop="$emit('dismissed')"
                    dark
                    flat
                >
                    Cancel
                </v-btn>

            </v-stepper-content>

            <v-stepper-content step="4">
                <v-card
                    class="mb-5"
                    height="200px"
                    elevation="0"
                >

                    Congrats 

                </v-card>

                <v-btn
                    color="cue-green-5"
                    @click.stop="$emit('dismissed')"
                    dark
                >
                    Ok
                </v-btn>

            </v-stepper-content>

        </v-stepper-items>

    </v-stepper>

</template>

<script>
export default {
   	props : [
        'sensors',
        'probeCount',
        'probeIndex'
    ],
    components : {
    },
	data () {
        return {
            step: 1,
            loading : false,
            sensorId: null,
        }
    },

    watch : {
        probeIndex(probeIndex)
        {
            this.loading = false

            if(probeIndex == 1)
                this.step = 3

            if(this.probeIndex > this.probeCount)
            {
                setTimeout(() => this.step = 4, 400)
            }
        }
    },
    methods : {
        initializeCalibration(sensorId)
        {
            this.sensorId = sensorId

            this.step = 2
            
            this.$emit('initializeCalibration', this.sensorId)
        },
        calibrationProbe()
        {
            this.loading = true
            this.$emit('calibrationProbe', this.sensorId)
        }
    }
}
</script>
