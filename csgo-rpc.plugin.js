//META{"name":"CSGORpc"}*//

const RPC = require("./csgo-rpc/rpc");
const rpc_client = new RPC.Client({transport: 'ipc'});
const CSGOGSI = require("./csgo-rpc/gsi/index");
const fs = require("fs");

class CSGORpc {
	/* BD functions */
	getName () {
		return "CSGORpc";
	}

	getVersion () {
		return "0.0.3";
	}

	getAuthor () {
		return "Hatry1337";
	}

	getDescription () {
		return "Shows your CS:GO game state to your discord rich presence.";
	}

	setData (key, value) {
		BdApi.setData(this.getName(), key, value);
	}

	getData (key) {
		return BdApi.getData(this.getName(), key);
	}

	/* Code related to Animations */
	load () {
		
	}

	activity = {
		largeImageKey: 'in_mainmenu',
		instance: false,
	}
	maps = [
		"cs_militia",
		"cs_assault",
		"de_cbble",
		"cs_italy",
		"de_mutini",
		"de_overpass",
		"de_swamp",
		"cs_agency",
		"de_cache",
		"de_dust2",
		"de_lake",
		"de_nuke",
		"gd_rialto",
		"de_vertigo",
		"de_anubis",
		"de_canals",
		"de_inferno",
		"de_mirage",
		"cs_office",
		"de_shortdust",
		"de_train",
		"de_shortnuke",
		"de_mutiny",
		"de_safehouse",
		"ar_dizzy",
		"ar_shoots",
		"ar_lunacy",
		"ar_monastery",
		"ar_baggage",
		"de_sugarcane",
		"de_bank",
		"de_stmarc",
		"dz_blacksite",
		"dz_sirocco"
	]
	modes = {
		"gungameprogressive": "Arms Race",
		"casual": "Casual",
		"competitive": "Competitive",
		"gungametrbomb": "Demolition",
		"deathmatch": "Deathmatch",
		"scrimcomp2v2": "Wingman",
		"survival": "Danger-Zone"
	}

	randomstr (len) {
		var chrs = 'abdehkmnpswxzABDEFGHKMNPQRSTWXZ123456789';
		var str = '';
		for (var i = 0; i < len; i++) {
			var pos = Math.floor(Math.random() * chrs.length);
			str += chrs.substring(pos, pos + 1);
		}
		return str;
	}

	start () {
		rpc_client.login({ clientId: "780128394409934878" });
		
		if(!this.getData("port")){
			BdApi.alert("CS:GO RPC ERROR", "You need to specify CS:GO GSI Port in plugin settings!");
			return;
		}
		if(!this.getData("csgodir")){
			BdApi.alert("CS:GO RPC ERROR", "You need to specify csgo.exe path in plugin settings!");
			return;
		}
		this.gsitoken = "csgo-discord-rpc-" + this.randomstr(8);
		fs.writeFileSync(this.getData("csgodir").replace(".exe", "\\cfg\\gamestate_integration_discord.cfg"), 
		`
"csgo-discord-rpc-gsi"
{
	"uri" "http://127.0.0.1:${this.getData("port")}"
	"timeout" "5.0"
	"buffer"  "0.1"
	"throttle" "0.1"
	"heartbeat" "30.0"
	"auth"
	{
		"token" "${this.gsitoken}"
	}
	"data"
	{
		"provider"            		"1"
		"map"                 		"1"
		"round"               		"1"
		"player_id"           		"1"
		"player_state"        		"1"
		"phase_countdowns"    		"1"
		"allplayers_id"       		"0"
		"allplayers_state"    		"0"
		"allplayers_match_stats"  	"0"
		"allplayers_weapons"  		"0"
		"allplayers_position" 		"0"
		"phase_countdowns"    		"0"
		"allgrenades"         		"0"
		"bomb"                		"0"
		"player_position"     		"0"
	}
}
		`);

		this.lastgsievent = new Date();

		this.gsi = new CSGOGSI({
			port: this.getData("port"),
			authToken: this.gsitoken
		});
		this.setData("timer", setInterval(()=>{
			if((new Date() - this.lastgsievent) < 3e4){
				rpc_client.setActivity(this.activity);
			}else{
				rpc_client.clearActivity();
			}
		}, 15e3));
		this.gsi.on("all", (data) => {
			this.lastgsievent = new Date();
			if(data.player){
				switch(data.player.activity){
					case "menu":
						this.activity.details = data.player.name;
						this.activity.state = "In Menu";
						this.activity.largeImageKey = 'in_mainmenu';
						this.activity.largeImageText = "Counter Strike: Global Offensive";
						this.activity.smallImageKey = undefined;
						this.activity.smallImageText = undefined;
						break;
					case "playing":
						this.activity.state = this.modes[data.map.mode] + ` CT:${data.map.team_ct.score} | T:${data.map.team_t.score}`;
						this.activity.largeImageKey = data.map.name;
						this.activity.largeImageText = 'Playing on ' + data.map.name;
						this.activity.smallImageKey = 'in_mainmenu';
						this.activity.smallImageText = 'Counter Strike: Global Offensive';
						if(!this.activity.details){
							this.activity.details = "Connecting..."
						}
						if(data.player.steamid === data.provider.steamid){
							this.activity.details = data.player.name;
						}
						if(this.maps.indexOf(data.map.name) === -1){
							this.activity.largeImageKey = "in_mainmenu",
							this.activity.smallImageKey = undefined;
						}
						if(!this.modes[data.map.mode]){
							this.activity.state = "unknown mode" + ` CT:${data.map.team_ct.score} | T:${data.map.team_t.score}`
						}
						break;
				}
			}
		})
	}

	stop () {
		if(this.gsi){
			this.gsi.server.close();
		}
		clearInterval(this.getData("timer"));
		this.setData("timer", false);
		rpc_client.clearActivity();
		rpc_client.destroy();
	}

	getSettingsPanel () {
		let settings = document.createElement("div");
		settings.style.padding = "10px";

		// Port
		settings.appendChild(GUI.newLabel("CS:GO GSI Server Port (Try to change this, if not working)"));
		let port = GUI.newInput();
		port.value = this.getData("port") || "";
		settings.appendChild(port);

		settings.appendChild(GUI.newDivider());

		// CS:GO Dir
		settings.appendChild(GUI.newLabel("Path to your csgo.exe"));
		let dir = GUI.newInput();
		dir.value = this.getData("csgodir") || "";
		var fd = GUI.newFDialog();
		var slct = GUI.newButton("Select")
		slct.onclick = () => {
			fd.click();
			return false;
		}
		settings.appendChild(dir);
		settings.appendChild(slct);

		// Save Button
		settings.appendChild(GUI.newDivider());
		let save = GUI.newButton("Save");
		save.onclick = () => {
			// Set csgo dir
			this.setData("csgodir", fd.files[0].path);

			// Set Port
			this.setData("port", port.value);

			this.stop();
			this.load();
			this.start();
		};
		settings.appendChild(save);

		// End
		return settings;
	}
}



/* GUI Wrapper */
const GUI = {
	newInput: () => {
		let input = document.createElement("input");
		input.className = "inputDefault-_djjkz input-cIJ7To";
		return input;
	},

	newLabel: (text) => {
		let label = document.createElement("h5");
		label.className = "h5-18_1nd";
		label.innerText = text;
		return label;
	},

	newDivider: () => {
		let divider = document.createElement("div");
		divider.style.paddingTop = "15px";
		return divider;
	},

	newTextarea: () => {
		let textarea = document.createElement("textarea");
		textarea.className = "input-cIJ7To scrollbarGhostHairline-1mSOM1";
		textarea.style.resize = "vertical";
		textarea.rows = 4;
		return textarea;
	},

	newButton: (text) => {
		let button = document.createElement("button");
		button.className = "button-38aScr lookFilled-1Gx00P colorBrand-3pXr91 sizeSmall-2cSMqn"; 
		button.innerText = text;
		return button;
	},

	newFDialog: () => {
		let fdialog = document.createElement('input');
		fdialog.setAttribute('type', 'file');
		fdialog.hidden = true;
		return fdialog;
	}
};
