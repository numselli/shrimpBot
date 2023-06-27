import postgres from "postgres";
import { Postgrelogin } from "/static/config.mjs"
export default postgres(
    {
        ...Postgrelogin,
        "database": "shrimpdb",
        "idle_timeout": 5,
        types: {
            rect: {
                to        : 1700,
                from      : [1700],
                serialize : x => '' + x,
                parse     : parseFloat
            }
        }
    }
)
