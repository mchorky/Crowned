import React from "react";
import { Store } from "../store/store-reducer";
import { ethers } from "ethers"; // npm install ethers
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Card,
  CardActions,
  CardContent,
  Grid,
  Stack,
  Chip,
  Checkbox,
} from "@mui/material";
import Paper from "@mui/material/Paper";
import * as utils from "../helpers/utils";
import { styled } from "@mui/material/styles";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Login from "../components/Login";
import Buy from "../components/Buy";

import {
  IMetadata,
  IPropsLogin,
  IContract,
  defaultContract,
  IContractQueryResults,
  defaultContractQueryResults,
  IPropsBuy,
  defaultBuyProps,
} from "../store/interfaces";
import "react-toastify/dist/ReactToastify.css";
import "react-toastify/dist/ReactToastify.min.css";
import { ToastContainer, toast } from "react-toastify";
import { useRouter } from "next/router";

import ShinyCroPepeContract from "../contracts/shinycropepe.json";

import { ThemeProvider, createTheme } from "@mui/material/styles";

const ActionButton = styled(Button)({
  marginTop: "20px",
  marginLeft: "20px",
  padding: "6px 12px",
});

interface IProps {}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const Body: React.FC<IProps> = () => {
  const router = useRouter();
  const ipfsGateway = "https://";

  const [contract, setContract] = React.useState("");
  const [contractObject, setContractObject] =
    React.useState<IContract>(defaultContract);
  const [retrievedContractData, setRetrievedContractData] =
    React.useState<IContractQueryResults>(defaultContractQueryResults);

  const { state, dispatch } = React.useContext(Store);

  const [dataRetrieved, setDataRetrieved] = React.useState(false);
  const [ipfsMetadata, setIpfsMetadata] = React.useState(
    new Map<string, IMetadata>()
  );
  const [mintAmount, setMintAmount] = React.useState(1);
  const [price, setPrice] = React.useState<number | string>(0);


  const [chosenTokenList, setChosenTokenList] = React.useState(
    new Array<string>()
  );

  const [bgColor, setBgColor] = React.useState("#E3DAC9");

  const [isLoading, setIsLoading] = React.useState(false);

  const [buyOptions, setBuyOptions] =
    React.useState<IPropsBuy>(defaultBuyProps);

  React.useEffect(() => {
    if (defaultContract.name !== contractObject.name) {
      setIsLoading(true);
      refreshContractResults(contractObject).then(() => {
        setIsLoading(false);
      });
    }
  }, [state.wallet.connected]);

  React.useEffect(() => {
    if (!router.isReady) return;
    importShinyCroPepeContract();
  }, [router.isReady]);


  const importShinyCroPepeContract = () => {
    importProperContract(ShinyCroPepeContract);
    let options = [
      {
        display: "Soon",
        url: "#",
      },
    ];
    let props: IPropsBuy = defaultBuyProps;
    props.options = options;
    setBuyOptions(props);
  };

  const importProperContract = (param: any) => {
    setIsLoading(true);
    setContractObject(param);
    setContract(JSON.stringify(param));
    refreshContractResults(param).then(() => {
      setIsLoading(false);
    });
    getMetadataFromEnv(param.name);
    setChosenTokenList([]);
    setBgColor(param.bgcolor);
    setMintAmount(0);
    setPrice(0);
  };

  const refreshContractResults = async (contract: IContract) => {
    const stringifiedContract = JSON.stringify(contract);
    if (state.wallet.connected) {
      let toastNotification: any;
      toastNotification = toast.loading("Retrieving data...");

      // Get data from Smart Contract
      const web3RefreshedData = await utils.getRefreshedDataWeb3(
        state.wallet.wcProvider,
        stringifiedContract,
        state.wallet.address
      );
      setRetrievedContractData(web3RefreshedData);
      calculatePrice(mintAmount, web3RefreshedData);

      setDataRetrieved(true);
      toast.update(toastNotification, {
        render: "Data retrieved successfully!",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
    } else {
      // Get data from API && contract json
      const totalSupply = await utils.getSupplyFromApi(contract.address);
      setRetrievedContractData((prevState) => ({
        ...prevState,
        totalSupply: totalSupply,
        collectionSize: contract.total_supply,
        publicCost: contract.publicCost,
        wlCost: contract.wlCost,
        name: contract.name,
        description: contract.description,
        maxPerTx: contract.max_per_transaction,
        imagePath: contract.imagePath,
        gifPath: contract.gifPath,
        address: contract.address,
      }));
    }
  };

  const updateAmount = (amount: number) => {
    let maxAmount = 20;
    if (amount <= 20 && amount >= 1) {
      setMintAmount(amount);
      calculatePrice(amount, retrievedContractData);
    }
  };

  const calculatePrice = (amount: number, data: IContractQueryResults) => {
    const contractData = data;
    let finalSingleCost = contractData.publicCost;

    let wlNumber = contractData.wlSpots;

    let finalPrice;

    if (
      contractData.wlMint &&
      wlNumber > 0 &&
      contractData.wlCost < finalSingleCost
    ) {
      if (wlNumber >= amount) {
        finalPrice = amount * contractData.wlCost;
      } else {
        finalPrice =
          wlNumber * contractData.wlCost +
          finalSingleCost * (amount - wlNumber);
      }
    } else {
      finalPrice = finalSingleCost * amount;
    }
    let priceFixed = finalPrice.toFixed(2);
    setPrice(priceFixed);
  };

  const mintNft = async () => {
    // Get ABI from current contract to be able to read functions
    const contractAbi = contractObject.abi;
    // Create new Contract instance - used later to call ABI functions
    const readContractInstance = new ethers.Contract(
      contractObject.address,
      contractAbi,
      state.wallet.browserWeb3Provider.getSigner()
    );

  
    // Prepare toast
    let toastNotification: any;

    try {
      // Multiply price 1000000000000000000 to ethers format
      let priceMultipied = Number(price) * 1000000000000000000;
      // Convert price to string to put value as parameter
      let priceStringified = priceMultipied.toString();

      let txResponse;

      console.log(mintAmount);
        txResponse = await readContractInstance.mintNFT(
          state.wallet.address,
          mintAmount,
          {
            value: priceStringified,
          }
        );
      

      // Set toast in loading status
      toastNotification = toast.loading("Minting... Please wait...");

      // Get tx receipt to read status
      const txReceipt = await txResponse.wait();
      console.log("Tx status: " + txReceipt.status);

      // Update toast depends on tx result
      if (txReceipt.status) {
        toast.update(toastNotification, {
          render: "Success!",
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        toast.update(toastNotification, {
          render: "Fail!",
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      }
    } catch (err) {
      toast("Error!", {
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
      console.log(err);
    }

    // Refresh contract to update minted numbers etc.
    refreshContractResults(contractObject);
  };


  const getMetadataFromEnv = async (name: string) => {
    let url = utils.getEnvConfig(name).metadataUrl;
    //let response = await fetch(url, { mode: 'no-cors' });
    let response = await fetch(url);
    let responseJson = await response.json();
    responseJson.map((item: IMetadata, i: number) =>
      ipfsMetadata.set(item.edition.toString(), correctIpfs(item))
    );
    setIpfsMetadata(ipfsMetadata);
  };

  const correctIpfs = (item: IMetadata) => {
    let ipfsFromItem = item.image.replace("ipfs://", "");
    let ipfsCor = ipfsFromItem.replace("/",".ipfs.nftstorage.link/");
    item.image = ipfsGateway + ipfsCor;
    return item;
  };


  const shinyCroPepeTheme = createTheme({
    palette: {
      primary: {
        main: "#5C4033",
      },
      background: {
        default: "#5C4033",
      },
      text: {
        primary: "#5C4033",
      },
    },
    typography: {
      fontFamily: ["Cinzel"].join(","),
      fontSize: 18,
    },
  });

  const [subTabValue, setSubTabValue] = React.useState(0);
  const handleSubTabChange = (
    event: React.SyntheticEvent,
    newValue: number
  ) => {
    setSubTabValue(newValue);
  };


  function NumberCircularProgress(props: any) {
    return (
      <Box position="relative" display="inline-block">
        <Box top={0} left={0} bottom={0} right={0} position="absolute">
          <CircularProgress
            style={{ color: "#cccccc" }}
            size={110}
            variant="determinate"
            value={100}
          />
        </Box>
        <CircularProgress
          size={110}
          variant="determinate"
          value={(props.supply / props.size) * 100}
        />
        <Box
          top={0}
          left={0}
          bottom={0}
          right={0}
          position="absolute"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Typography
            variant="body1"
            component="div"
            color="textSecondary"
          >{`${props.supply}/${props.size}`}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <div style={{ backgroundColor: bgColor }}>
        <ThemeProvider
          theme={shinyCroPepeTheme}
        >
          <Box
            sx={{
              flexGrow: 1,
              p: 5,
              minHeight: "84vh",
            }}
            style={{ backgroundColor: bgColor }}
          >
            <Paper elevation={0} style={{ backgroundColor: bgColor }}>
              <Box sx={{ width: "100%" }}>
                  {!isLoading ? (
                    <Box sx={{ width: "100%" }}>
                      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                        <Tabs
                          value={subTabValue}
                          onChange={handleSubTabChange}
                          aria-label="basic tabs example"
                          variant="scrollable"
                        >
                          <Tab label="Mint" {...a11yProps(0)} />
                          {state.wallet.connected ? (
                            <Tab label="My Rings" {...a11yProps(1)} />
                          ) : null}
                        </Tabs>
                      </Box>
                      <TabPanel value={subTabValue} index={0}>
                        <Grid
                          container
                          spacing={{ xs: 2, sm: 2, md: 3 }}
                          columns={{ xs: 2, sm: 8, md: 12 }}
                        >
                          <Grid item xs={2} sm={8} md={4}>
                            <Box
                              component="img"
                              sx={{
                                height: "100%",
                                width: "100%",
                              }}
                              alt="Gif"
                              src={retrievedContractData.gifPath}
                            />
                          </Grid>
                          <Grid item xs={2} sm={8} md={8}>
                            <Card sx={{ width: "100%" }}>
                              <CardContent>
                                <Typography variant="button">
                                  Mint CRO_wned Ring
                                </Typography>
                                <Typography
                                  sx={{ mb: 1.5 }}
                                  color="text.secondary"
                                ></Typography>
                                <Typography
                                  variant="body2"
                                  style={{ whiteSpace: "pre-line" }}
                                >
                                  {retrievedContractData.description}
                                </Typography>
                                <Typography
                                  sx={{ mb: 3 }}
                                  color="text.secondary"
                                ></Typography>
                                <Typography
                                  sx={{ mb: 3 }}
                                  color="text.secondary"
                                ></Typography>

                                <Grid
                                  container
                                  spacing={{ xs: 2, sm: 2, md: 3 }}
                                  columns={{ xs: 2, sm: 8, md: 12 }}
                                >
                                  <Grid item xs={2} sm={8} md={4}>
                                    <Typography
                                      sx={{ fontSize: 14 }}
                                      color="text.secondary"
                                      gutterBottom
                                    >
                                      Progress
                                    </Typography>
                                    <Typography
                                      sx={{ mb: 3 }}
                                      color="text.secondary"
                                    ></Typography>
                                    <NumberCircularProgress
                                      supply={retrievedContractData.totalSupply}
                                      size={
                                        retrievedContractData.collectionSize
                                      }
                                    />
                                  </Grid>
                                  
                                    <Grid item xs={2} sm={8} md={4}>
                                      <Typography
                                        sx={{ fontSize: 14 }}
                                        color="text.secondary"
                                        gutterBottom
                                      >
                                        Free mints
                                      </Typography>
                                      <Typography variant="h5" component="div">
                                        {state.wallet.connected && dataRetrieved
                                          ? retrievedContractData.wlSpots
                                          : "?"}
                                      </Typography>
                                    </Grid>
                                  
                                </Grid>
                                <Typography
                                  sx={{ mb: 3 }}
                                  color="text.secondary"
                                ></Typography>

                              </CardContent>
                              <CardActions>
                                {state.wallet.connected && dataRetrieved ? (
                                  <div>
                                    <Button
                                      variant="contained"
                                      onClick={() =>
                                        updateAmount(mintAmount - 1)
                                      }
                                      disabled={
                                        (!retrievedContractData.publicMint &&
                                          retrievedContractData.wlMint &&
                                          retrievedContractData.wlSpots == 0) ||
                                        mintAmount == 1 ||
                                        mintAmount == 0
                                      }
                                    >
                                      -
                                    </Button>
                                    <Button size="large">{mintAmount}</Button>
                                    <Button
                                      variant="contained"
                                      onClick={() =>
                                        updateAmount(mintAmount + 1)
                                      }
                                      disabled={
                                        (!retrievedContractData.publicMint &&
                                          !retrievedContractData.wlMint) ||
                                        (!retrievedContractData.publicMint &&
                                          retrievedContractData.wlMint &&
                                          (retrievedContractData.wlSpots == 0 ||
                                            retrievedContractData.wlSpots ==
                                              mintAmount)) ||
                                        mintAmount ==
                                          retrievedContractData.maxPerTx ||
                                        (retrievedContractData.maxPerTx >
                                          retrievedContractData.collectionSize -
                                            retrievedContractData.totalSupply &&
                                          mintAmount ==
                                            retrievedContractData.collectionSize -
                                              retrievedContractData.totalSupply)
                                      }
                                    >
                                      +
                                    </Button>
                                    <Typography
                                      sx={{ mb: 3 }}
                                      color="text.secondary"
                                    ></Typography>
                                    <Button
                                      disabled={
                                        (!retrievedContractData.publicMint &&
                                          !retrievedContractData.wlMint) ||
                                        (!retrievedContractData.publicMint &&
                                          retrievedContractData.wlMint &&
                                          retrievedContractData.wlSpots == 0) ||
                                        mintAmount == 0
                                      }
                                      variant="contained"
                                      onClick={mintNft}
                                    >
                                      Mint NFT {price} CRO
                                    </Button>
                                    <Typography
                                      sx={{ mb: 1 }}
                                      color="text.secondary"
                                    ></Typography>
                                    <Buy options={buyOptions.options} />
                                  </div>
                                ) : (
                                  <div>
                                    <Login
                                      jsonString={JSON.stringify(
                                        contractObject
                                      )}
                                    />
                                    <Typography
                                      sx={{ mb: 1 }}
                                      color="text.secondary"
                                    ></Typography>
                                    <Buy options={buyOptions.options} />
                                  </div>
                                )}
                              </CardActions>
                            </Card>
                          </Grid>
                        </Grid>
                      </TabPanel>
                      {state.wallet.connected ? (
                        <TabPanel value={subTabValue} index={1}>
                          <div className="nft-section">
                            <Typography
                              variant="h5"
                              component="div"
                              gutterBottom
                            >
                              My NFTs{" "}
                              {"(" +
                                retrievedContractData.realTokens.length +
                                ")"}
                            </Typography>
                            <Typography
                              sx={{ mb: 1 }}
                              color="text.secondary"
                            ></Typography>
                            {retrievedContractData.address !=
                            ShinyCroPepeContract.address ? (
                              <>
                                <Typography
                                  variant="caption"
                                  component="div"
                                  gutterBottom
                                >
                                  Chosen items list:
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                  {chosenTokenList.map((item) => (
                                    <Chip key={item} label={item} />
                                  ))}
                                </Stack>
                                <Typography
                                  sx={{ mb: 1 }}
                                  color="text.secondary"
                                ></Typography>
                              </>
                            ) : null}
                            
                            <div className="nft-logo">
                              {ipfsMetadata.size > 0
                                ? retrievedContractData.realTokens.map(
                                    (token: string, i: number) => (
                                      <div key={i}>
                                        <img
                                          src={ipfsMetadata.get(token)?.image}
                                          alt={token}
                                        />
                                        <Typography variant="caption">
                                          {ipfsMetadata.get(token)?.name}
                                        </Typography>
                                      </div>
                                    )
                                  )
                                : null}
                            </div>
                          </div>
                        </TabPanel>
                      ) : null}
                    </Box>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "50vh",
                      }}
                    >
                      <div
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "50%",
                          border: "5px solid #ccc",
                          borderTopColor: "#000",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    </div>
                  )}
              </Box>
            </Paper>
          </Box>
        </ThemeProvider>
      </div>
      <style>
        {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
      </style>
    </>
  );
};

export default Body;
