
/*******************************************************************************
 *  Copyright 2009 Apstrata
 *  
 *  This file is part of Apstrata Database Javascript Client.
 *  
 *  Apstrata Database Javascript Client is free software: you can redistribute it
 *  and/or modify it under the terms of the GNU Lesser General Public License as
 *  published by the Free Software Foundation, either version 3 of the License,
 *  or (at your option) any later version.
 *  
 *  Apstrata Database Javascript Client is distributed in the hope that it will be
 *  useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Lesser General Public License for more details.
 *  
 *  You should have received a copy of the GNU Lesser General Public License
 *  along with Apstrata Database Javascript Client.  If not, see <http://www.gnu.org/licenses/>.
 * *****************************************************************************
 */

dojo.provide('apstrata.home.ApConfig');

dojo.setObject("apstrata.apConfig", {
    // apstrata.ui related
    "apstrata.ui": {
        "widgets.Login" : {
            autoLogin: false
        }
    },
 
    // apstrata.sdk related
    "apstrata.sdk": {
        "Connection" : {
			credentials: {
				key:''
				
			},
			serviceURL: '',
			
			
			defaultStore: 'apstrata',
			timeout: 10000,
        }
    },
    
    
    "apstrata.services" : {
    	"targetClusterUrl" : '',
    	"worbenchUrl" : '' 
    }
    
})
