import React from "react";
import Typography from "@mui/material/Typography";
import { AppBar, Box, Icon, SvgIcon, Grid } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import TwitterIcon from "@mui/icons-material/Twitter";
import IconButton from "@mui/material/IconButton";

interface IProps {}

const Footer: React.FC<IProps> = () => {
  const theme = createTheme({
    palette: {
      primary: {
        main: "#5C4033", //"#397034",
      },
      background: {
        default: "#7fd977",
      },
    },
    typography: {
      fontFamily: ["Cinzel"].join(","),
      fontSize: 18,
    },
  });
  return (
    <div>
      <ThemeProvider theme={theme}>
        <Box
          sx={{ flexGrow: 1 }}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            width: "100%",
            backgroundColor: "#91d98d",
          }}
        >
          <AppBar position="static">
            <Grid container columns={{ xs: 6, sm: 6, md: 12 }}>
              <Grid item xs={6} sm={6} md={6}>
                <Box sx={{ textAlign: "left", m: 2 }}>
                  <Typography>Crowned 2024 &nbsp;</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={6} md={6}>
                <Box sx={{ textAlign: "right", m: 2 }}>
                  <Typography>
                    <a href="https://google.com" target="blank">
                      <img
                        src="./gitbookicon.svg"
                        style={{ height: "25px" }}
                      ></img>
                    </a>
                    &nbsp;
                    <a href="https://discord.gg/ABC" target="blank">
                      <img
                        src="./discordicon.svg"
                        style={{ height: "25px" }}
                      ></img>
                    </a>
                    &nbsp;
                    <a href="https://twitter.com/ABC" target="blank">
                      <img
                        src="./twittericon.svg"
                        style={{ height: "25px" }}
                      ></img>
                    </a>
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </AppBar>
        </Box>
      </ThemeProvider>
    </div>
  );
};

export default Footer;
