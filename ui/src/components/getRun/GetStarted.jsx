import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  getStarted: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    width: theme.spacing(64),
    margin: 'auto',
    height: '100%',
  },
  graphicContainer: {
    [theme.breakpoints.down('sm')]: {
      display: 'none',
    },
    height: theme.spacing(45),
    width: theme.spacing(45),
  },
  graphic: {
    opacity: 0.6,
    objectFit: 'none',
    width: '200%',
    height: '200%',
    transform: 'scale(0.5) translateX(-50%) translateY(-50%)',
  },
  getStartedAction: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontSize: '20px',
    '& > *': {
      marginBottom: theme.spacing(2),
    },
  },
}));

const GetStarted = ({ onGetStarted }) => {
  const classes = useStyles();

  const message = onGetStarted ? (
    <>
      <div>No BLD locked</div>
      <Button
        onClick={() => onGetStarted()}
        className={classes.button}
        variant="contained"
        color="primary"
      >
        Get Started
      </Button>
    </>
  ) : (
    <>
      <div>Loading chain data...</div>
    </>
  );

  return (
    <div className={classes.getStarted}>
      <div className={classes.graphicContainer}>
        <img className={classes.graphic} src="/assets/boats.png" />
      </div>
      <div className={classes.getStartedAction}>{message}</div>
    </div>
  );
};

export default GetStarted;
