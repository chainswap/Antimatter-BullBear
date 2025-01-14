import React, { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { createChart, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts'
import styled from 'styled-components'
import Swap, { OptionField } from '../Swap'
import { Option, OptionPrice } from '../../state/market/hooks'
import SwitchTab from 'components/SwitchTab'
import { Axios } from 'utils/option/axios'
import { useActiveWeb3React } from 'hooks'
import { useNetwork } from 'hooks/useNetwork'
// import { ButtonOutlinedPrimary } from 'components/Button'
import { formatDexTradeLineData, DexTradeLineData } from 'utils/option/utils'
import { TYPE } from 'theme'

const Wrapper = styled.div`
  display: flex;
  ${({ theme }) => theme.mediaWidth.upToMedium`
  flex-direction: column;
  gap: 20px
  `}
`

const GraphWrapper = styled.div`
  margin: 20px 40px;
  width: 100%;
  height: 100%;
  position: relative;
  max-width: 559px;
  /* ${({ theme }) => theme.mediaWidth.upToMedium`
  max-width: 50%;
  `} */
  ${({ theme }) => theme.mediaWidth.upToMedium`
  width: auto;
  margin: 20px 24px 20px 14px;
  max-width: unset
  `}
`

const Chart = styled.div`
  background-color: #000;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 3px;
`
// const ChartWrapper = styled.div`
//   width: 100%;
//   height: 100%;
//   margin-left: 3px;
//   position: relative;
// `

const ButtonGroup = styled.div`
  width: 100%;
  display: flex;
  margin: 24px 0 36px;
  button:first-child {
    margin-right: 10px;
  }
  ${({ theme }) => theme.mediaWidth.upToMedium`
  button{
    font-size: 14px
  }
  `}
`
// const Button = styled(ButtonOutlinedPrimary)<{ isActive: boolean }>`
//   flex-grow: 0;
//   padding: 6px 14px;
//   width: auto !important;
//   :focus {
//     border-color: ${({ theme }) => theme.primary1};
//     color: ${({ theme }) => theme.primary1};
//   }
//   ${({ isActive, theme }) => (!isActive ? `border-color:${theme.text3}; color:${theme.text3};` : '')}
// `

const CurrentPrice = styled.div`
  position: absolute;
  right: 0;
  top: 14px;
  white-space: nowrap;
  font-size: 18px;
  font-weight: 400;
  font-family: Futura PT;
  color: ${({ theme }) => theme.text3};
  ${({ theme }) => theme.mediaWidth.upToMedium`
    white-space: pre-wrap;
    text-align: right;
    font-size: 14px;
    font-weight: 400;
  `}
  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    font-size: 12px;
  `}
`

const Tabs = {
  CALL: 'Bull Token',
  PUT: 'Bear Token'
}

export default function OptionSwap({
  option,
  // handleOptionType,
  optionPrice
}: {
  option?: Option
  // handleOptionType: (option: string) => void
  optionPrice: OptionPrice | undefined
}) {
  const transactions = useSelector((store: any) => store.transactions)
  const { chainId } = useActiveWeb3React()
  const [currentTab, setCurrentTab] = useState<keyof typeof Tabs>('CALL')
  const [lineSeries, setLineSeries] = useState<ISeriesApi<'Line'> | undefined>(undefined)
  // const [isMarketPriceChart, setIsMarketPriceChart] = useState(true)
  const [chart, setChart] = useState<IChartApi | undefined>(undefined)
  const [callChartData, setCallChartData] = useState<DexTradeLineData[] | undefined>(undefined)
  const [putChartData, setPutChartData] = useState<DexTradeLineData[] | undefined>(undefined)
  const [graphLoading, setGraphLoading] = useState(true)
  const [txHash, setTxHash] = useState('')
  const [refresh, setRefresh] = useState(0)

  const handleHash = useCallback(hash => setTxHash(hash), [])

  const priceCall = optionPrice?.priceCall
  const pricePut = optionPrice?.pricePut

  const {
    httpHandlingFunctions: { errorFunction, pendingFunction, pendingCompleteFunction },
    NetworkErrorModal,
    NetworkPendingSpinner
  } = useNetwork()

  useEffect(() => {
    if (chainId && transactions?.[chainId]?.[txHash]?.receipt?.status === 1) {
      setRefresh(re => re + 1)
    }
  }, [transactions, chainId, txHash])

  useEffect(() => {
    setTxHash('')
    pendingFunction()
    const callId = option?.callToken?.address ?? undefined
    const putId = option?.putToken?.address ?? undefined

    if (!callId || !putId) return

    const complete = { call: false, put: false }

    if (callId) {
      Axios.get('getDexTradesList', { chainId: chainId, tokenAddress: callId })
        .then(r => {
          complete.call = true
          if (r.data) {
            setCallChartData(formatDexTradeLineData(r.data.data))
          }
          if (complete.put) {
            pendingCompleteFunction()
            setGraphLoading(false)
          }
        })
        .catch(() => errorFunction())
    }
    if (putId) {
      Axios.get('getDexTradesList', { chainId: chainId, tokenAddress: putId })
        .then(r => {
          complete.put = true
          if (r.data) {
            setPutChartData(formatDexTradeLineData(r.data.data))
          }
          if (complete.call) {
            pendingCompleteFunction()
            setGraphLoading(false)
          }
        })
        .catch(() => errorFunction())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chainId,
    errorFunction,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    option?.callToken?.address,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    option?.putToken?.address,
    pendingCompleteFunction,
    pendingFunction,
    refresh
  ])

  useEffect(() => {
    const chartElement = document.getElementById('chart') ?? ''
    const chart = createChart(chartElement, {
      width: chartElement ? chartElement.offsetWidth : 556,
      height: 328,
      layout: {
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'Roboto'
      },
      grid: {
        vertLines: {
          style: LineStyle.Dotted,
          color: 'rgba(255, 255, 255, 0.4)'
        },
        horzLines: {
          style: LineStyle.Dotted,
          color: 'rgba(255, 255, 255, 0.4)'
        }
      }
    })
    chart.applyOptions({
      leftPriceScale: { autoScale: true, visible: true },
      rightPriceScale: { visible: false },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        shiftVisibleRangeOnNewBar: true,
        tickMarkFormatter: (time: any) => {
          const date = new Date(time)
          const year = date.getUTCFullYear()
          const month = date.getUTCMonth() + 1
          const day = date.getUTCDate()
          return year + '/' + month + '/' + day
        }
      },
      crosshair: {
        vertLine: {
          labelVisible: false
        }
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true
      }
    })
    const resizeFunction = () => {
      chart.resize(chartElement ? chartElement.offsetWidth : 556, 328)
    }
    window.addEventListener('resize', resizeFunction)
    setChart(chart)
    const lineSeries = chart.addLineSeries({
      color: '#33E74F',
      lineWidth: 2,
      // downColor: '#FF0000',
      // wickVisible: false,
      priceFormat: {
        type: 'price',
        precision: 2
      }
    })
    setLineSeries(lineSeries)
    return () => window.removeEventListener('resize', resizeFunction)
  }, [])

  useEffect(() => {
    if (lineSeries) {
      if (currentTab === 'CALL') {
        callChartData && lineSeries.setData(callChartData)
      } else {
        putChartData && lineSeries.setData(putChartData)
      }
    }
    if (chart) {
      chart.timeScale().fitContent()
    }
  }, [lineSeries, chart, currentTab, putChartData, callChartData])

  // const handleMarketPriceChart = useCallback(() => setIsMarketPriceChart(true), [])
  // const handleModalChart = useCallback(() => setIsMarketPriceChart(false), [])

  const handleTabClick = useCallback(
    (tab: string) => () => {
      setCurrentTab(tab as keyof typeof Tabs)
    },
    []
  )

  return (
    <>
      <NetworkErrorModal />
      <Wrapper>
        <Swap
          optionPrice={optionPrice}
          // handleOptionType={handleOptionType}
          option={option}
          setParentTXHash={handleHash}
        />
        <GraphWrapper>
          {graphLoading && <NetworkPendingSpinner paddingTop="0" />}
          <CurrentPrice>
            Current price: {'\n'}${' '}
            {currentTab === OptionField.CALL
              ? priceCall
                ? priceCall.toSignificant(6)
                : '-'
              : pricePut
              ? pricePut.toSignificant(6)
              : '-'}
          </CurrentPrice>
          <SwitchTab
            onTabClick={handleTabClick}
            currentTab={currentTab}
            tabs={Tabs}
            tabStyle={{ fontFamily: 'Futura PT', fontSize: 20, fontWeight: 500 }}
          />

          <ButtonGroup>
            {/* <Button isActive={isMarketPriceChart} onClick={handleMarketPriceChart} style={{ display: 'none' }}></Button> */}
            <TYPE.body fontWeight="500" fontSize={18}>
              Market Price
            </TYPE.body>
            {/* <Button isActive={!isMarketPriceChart} onClick={handleModalChart}>
              Price Modeling Prediction
            </Button> */}
          </ButtonGroup>

          <Chart id="chart" />
        </GraphWrapper>
      </Wrapper>
    </>
  )
}
